import pandas as pd

def get_data():
    df=pd.read_json("all_data_912/dataset.json")
    return df
# given a context it should give a respone
def eval(context):
    pass

# different benchmarks for col/row/inverted/raw
# shuld have a feature for single llm or multiple llms evaluation
def eval_benchmark():
    pass
