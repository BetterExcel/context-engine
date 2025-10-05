import openpyxl
from typing import Literal, Union

def detect_type(value) -> Literal["number", "string", "date", "empty"]:
    """Simple type detection for a cell value."""
    if value is None:
        return "empty"
    if isinstance(value, (int, float)):
        return "number"
    if hasattr(value, "year"):  # datetime-like
        return "date"
    return "string"

def col_based_processing(path: str,sheet_name: Union[int,str,None]=None) -> str:
    """
    Encode Excel sheet column by column into a string.
    Format: |A1, 100, number|
    """
    wb = openpyxl.load_workbook(path, data_only=True)
    if isinstance(sheet_name, int):
        sheet = wb.worksheets[sheet_name]
    elif isinstance(sheet_name, str):
        sheet = wb[sheet_name]
    else:
        sheet = wb.active

    parts = []
    for col in sheet.iter_cols():
        col_parts = []
        for cell in col:
            ctype = detect_type(cell.value)
            col_parts.append(f"| {cell.coordinate}, {cell.value}, {ctype} ")
        parts.append("".join(col_parts))
    parts.append("|")  # close the last cell in the column
    return " ".join(parts)  # separator between columns

def row_based_processing(path: str,sheet_name: Union[int,str,None]=None) -> str:
    """
    Encode Excel sheet row by row into a string.
    Format: |A1, 100, number|
    """
    wb = openpyxl.load_workbook(path, data_only=True)
    if isinstance(sheet_name, int):
        sheet = wb.worksheets[sheet_name]
    elif isinstance(sheet_name, str):
        sheet = wb[sheet_name]
    else:
        sheet = wb.active

    parts = []
    for row in sheet.iter_rows():
        row_parts = []
        for cell in row:
            ctype = detect_type(cell.value)
            row_parts.append(f"| {cell.coordinate}, {cell.value}, {ctype} ")
        parts.append(" ".join(row_parts))
        parts.append("|")  # close the last cell in the row
    return " ".join(parts)  # separator between rows


if __name__ == "__main__":
    path = "test.xlsx"  # replace with your Excel file path

    print("Column-based encoding:")
    print(col_based_processing(path))

    print("\nRow-based encoding:")
    print(row_based_processing(path))
