from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()
import os
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

response = client.chat.completions.create(
    model="gpt-4o-search-preview",
    messages=[
        {"role": "system", "content": "search the web and answer user queries based on the search results"},
        {"role": "user", "content": "what is todays date"}
    ]
)

print(response.choices[0].message.content)

from sklearn.metrics import precision_score, recall_score, f1_score
