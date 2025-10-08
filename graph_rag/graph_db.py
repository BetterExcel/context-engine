from langchain_openai import ChatOpenAI
from langchain_community.graphs import Neo4jGraph
from langchain_community.chains.graph_qa.cypher import GraphCypherQAChain
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI
from langchain_community.graphs import Neo4jGraph
import sys,subprocess ,re
class graph_database:
    def __init__(self, url, username, password):
        self.graph = Neo4jGraph(
            url=url,
            username=username,
            password=password
        )
        cmd = [
        sys.executable, "-m", "graphrag", "prompt-tune","--config", "settings.yaml", "--output", "llm_tuned", "--limit", "10", "--discover-entity-types",]   
        subprocess.run(cmd)
        self.extract_graph_prompt=open('llm_tuned/extract_prompt.txt')
        self.extract_graph_prompt.replace('{','{{').replace('}','}}').replace('{{input_text}}','{input_text}')
        self.llm = ChatOpenAI(temperature=0.0, model="gpt-4o")
        
        # --- Fixed parser ---
    def __parse_data(self,data):
        data = (
            data.replace("{tuple_delimiter}", "|")
                .replace("{record_delimiter}", "\n")
                .replace("{completion_delimiter}", "")
        )
        self.entities, self.relationships = [], []

        pattern = re.compile(r'\("([^"]+)"\|([^|]+)\|([^|]+)\|([^|)]+)(?:\|([^|)]+))?\)')
        # Groups:
        # 1 = kind ("entity" or "relationship")
        # 2.. = remaining tokens (3 or 4)

        for line in data.splitlines():
            line = line.strip()
            if not line:
                continue

            m = pattern.match(line)
            if not m:
                continue

            kind = m.group(1)
            t1, t2, t3, t4, t5 = m.groups()

            if kind == "entity":
                self.entities.append({
                    "name": t2,
                    "type": t3,
                    "description": t4
                })
            elif kind == "relationship":
                self.relationships.append({
                    "source": t2,
                    "target": t3,
                    "description": t4,
                    "weight": t5
                })

        return self.entities, self.relationships


    def __insert_data(self,data):
        self.entities, self.relationships = self.__parse_data(data)

        print("Entities:", self.entities)
        print("Relationships:", self.relationships)

        # --- Insert into Neo4j ---
        for e in self.entities:
            self.graph.query("""
                MERGE (n:Entity {name: $name})
                SET n.type = $type, n.description = $description
            """, params=e)

        for r in self.relationships:
            if r.get("weight") in [None, ""]:
                r['weight']= "unknown"

            self.graph.query("""
                MERGE (a:Entity {name: $source})
                MERGE (b:Entity {name: $target})
                MERGE (a)-[rel:RELATED_TO {description: $description, weight: $weight}]->(b)
            """, params=r)

    def insert_whole_doc(self,chunks):
        for i,chunk in enumerate(chunks):
            prompt = ChatPromptTemplate.from_template(self.extract_graph_prompt)
            chain = prompt | self.llm | StrOutputParser()
            response = chain.invoke({"input_text": chunk})
            self.__insert_data(response)
            print(f"✅ Graph{i/len(chunks)} successfully inserted into Neo4j!")

    def cypher_query(self, query: str, params: dict = None):
        """
        Execute a Cypher query on the Neo4j database.
        
        Args:
            query (str): The Cypher query to execute.
            params (dict): Optional parameters for the query.
        
        Returns:
            list: Query results as a list of dictionaries.
        """
        if params is None:
            params = {}
        try:
            result = self.graph.query(query, params=params)
            return result
        except Exception as e:
            print(f"Error executing query: {e}")
            return []

    def remove_existing_data(self):   
        self.graph.query("MATCH (n) DETACH DELETE n")
