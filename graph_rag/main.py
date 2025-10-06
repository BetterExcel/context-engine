import json
with open("../anchored_index_output.json", "r") as f:
    data = json.load(f)
headers=data["sheets"]['Salary List']["headers"]
anchors = data["sheets"]["Salary List"]["anchors"]
chunks=[]
for chunk_name, chunk_info in anchors.items():
    chunk_info['headers']=headers
    chunks.append(chunk_info)
print(f"Loaded {len(chunks)} chunks")
texts=chunks
chunks
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(temperature=0.0, model="gpt-4o")
import subprocess, sys

cmd = [
    sys.executable, "-m", "graphrag", "prompt-tune",
    "--config", "settings.yaml",
    "--output", "llm_tuned",
    "--limit", "10",
    "--discover-entity-types",
]

prompt_template=open('llm_tuned/extract_graph.txt').read()
prompt_template3=prompt_template.replace('{','{{').replace('}','}}').replace('{{input_text}}','{input_text}')
print(prompt_template3)
prompt = ChatPromptTemplate.from_template(prompt_template3)
chain = prompt | llm | StrOutputParser()
response = chain.invoke({"input_text": texts[10]})
print(response)
import re, os
from langchain_neo4j import Neo4jGraph

# --- Neo4j connection ---
os.environ["NEO4J_URI"] = "neo4j://127.0.0.1:7687"
os.environ["NEO4J_USERNAME"] = "neo4j"
os.environ["NEO4J_PASSWORD"] = "password"

graph = Neo4jGraph(refresh_schema=False)
graph.query("MATCH (n) DETACH DELETE n")

# --- Fixed parser ---
def parse_data(data):
    data = (
        data.replace("{tuple_delimiter}", "|")
            .replace("{record_delimiter}", "\n")
            .replace("{completion_delimiter}", "")
    )
    entities, relationships = [], []

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
            entities.append({
                "name": t2,
                "type": t3,
                "description": t4
            })
        elif kind == "relationship":
            relationships.append({
                "source": t2,
                "target": t3,
                "description": t4,
                "weight": t5
            })

    return entities, relationships


# --- Example input ---
data = """("entity"{tuple_delimiter}CLG0065{tuple_delimiter}ID{tuple_delimiter}Identifier for a data record)
{record_delimiter}
("entity"{tuple_delimiter}76{tuple_delimiter}value{tuple_delimiter}Value associated with CLG0065 in some metric)
{record_delimiter}
("relationship"{tuple_delimiter}CLG0095{tuple_delimiter}5.87{tuple_delimiter}5.87 is a metric value associated with the ID CLG0095{tuple_delimiter}10)
{completion_delimiter}"""
def insert_data(data):
    entities, relationships = parse_data(data)

    print("Entities:", entities)
    print("Relationships:", relationships)

    # --- Insert into Neo4j ---
    for e in entities:
        graph.query("""
            MERGE (n:Entity {name: $name})
            SET n.type = $type, n.description = $description
        """, params=e)

    for r in relationships:
        if r.get("weight") in [None, ""]:
            r['weight']= "unknown"

        graph.query("""
            MERGE (a:Entity {name: $source})
            MERGE (b:Entity {name: $target})
            MERGE (a)-[rel:RELATED_TO {description: $description, weight: $weight}]->(b)
        """, params=r)

def insert_whole_doc(chunks):
    for i,chunk in enumerate(chunks):
        response = chain.invoke({"input_text": chunk})
        insert_data(response)
        print(f"✅ Graph{i/len(chunks)} successfully inserted into Neo4j!")

insert_whole_doc(texts)
# insert_data(response)
from langchain_openai import ChatOpenAI
from langchain_community.graphs import Neo4jGraph
from langchain_community.chains.graph_qa.cypher import GraphCypherQAChain

# connect to Neo4j
graph = Neo4jGraph(
    url="neo4j://127.0.0.1:7687",
    username="neo4j",
    password="password"
)

llm = ChatOpenAI(model="gpt-4-turbo", temperature=0)

chain = GraphCypherQAChain.from_llm(
    llm,
    graph=graph,
    verbose=True,
    allow_dangerous_requests=True
)
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

rephrase_prompt = PromptTemplate.from_template(
    "Convert the question into a concise graph search phrase:\nQuestion: {question}\nSearch phrase:"
)

rephraser = LLMChain(llm=llm, prompt=rephrase_prompt)

# --- Function with feedback loop ---
def query_graph_with_rephrase(user_input, max_attempts=3):
    attempt = 0
    while attempt < max_attempts:
        graph_query = rephraser.run({"question": user_input}).strip()
        print(f"\n Attempt {attempt+1}: Graph query → {graph_query}")
        
        response = chain.invoke({"query": graph_query})
        result = response.get("result", "").strip()

        if result and "don't know" not in result.lower():
            print("\n Found answer:")
            return result
        else:
            user_input = f"Try a different phrasing for: {graph_query}"
            attempt += 1
    
    return " No valid result after rephrasing attempts."

# --- Run ---
user_input = "what is Microsoft pay"
final_result = query_graph_with_rephrase(user_input)
print("\nFinal Result:", final_result)