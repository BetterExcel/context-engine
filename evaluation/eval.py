from context_processing.col_row_context import col_based_processing, row_based_processing
from context_processing.raw_dump import get_read_data
from context_processing.inverted_index import build_inverted_index
from typing import Union
import openpyxl
import json
import pandas as pd
from llm_util import call_llm
def get_data():
    df=pd.read_json("all_data_912/dataset.json")
    return df
# given a context it should give a respone
def eval(context):
    prompt=f"Given the context {context}, answer the question"
    response=call_llm(prompt)
    return response
def list_sheets(path: str):
    wb = openpyxl.load_workbook(path, data_only=True)
    return wb.sheetnames
def make_context(spreadsheet_path,sheet_name:Union[int,str,None]=None,type="col"):
    if sheet_name is None:
        sheets=list_sheets(spreadsheet_path)
    else :
        sheets=[sheet_name]
    context={}
    for sheet in sheets:
        if type=="col":
            context[sheet]= col_based_processing(spreadsheet_path,sheet)
        elif type=="row":
            context[sheet]= row_based_processing(spreadsheet_path,sheet)
        elif type=="inverted":
            context[sheet]= build_inverted_index(spreadsheet_path,sheet)
        elif type=="raw":
            context[sheet]= get_read_data(spreadsheet_path,sheet)
    return context
# different benchmarks for col/row/inverted/raw
# shuld have a feature for single llm or multiple llms evaluation


def eval_benchmark():
    df=get_data()
    df['context']=df['spreadsheet_path'].apply(make_context)
    df['eval_response']=df['context'].apply(eval)
    df['answer_correctness']= df.apply(lambda row: row['eval_response'].strip().lower() == row['answer'].strip().lower(), axis=1)
    return df 

# needle in haystack type of eval diffent from the all_data_912 kind of data and should for context , probably use olama models to save cost
#TODO: reaserch some method whre gicen context , it can genrate quetsions and for the needle in haystack eval 
def needle_in_haystack(contex,question):
    pass

def eval_needle_in_haystack():
    pass

if __name__ == "__main__":

    print(make_context("test.xlsx",type="row"))
    with open("eval_output.json", "w") as f:
        json.dump(make_context("test.xlsx"), f, indent=2)


