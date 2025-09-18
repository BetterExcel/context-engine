import openpyxl

def get_read_data(path: str, sheet_name=0) -> str:
    """
    Read Excel data and return only the values as a single string.
    Example: "Name Age Score Alice 30 95 Bob 25 88"
    """
    wb = openpyxl.load_workbook(path, data_only=True)

    # select sheet
    if isinstance(sheet_name, int):
        sheet = wb.worksheets[sheet_name]  # by index
    else:
        sheet = wb[sheet_name]  # by name

    parts = []
    for row in sheet.iter_rows(values_only=True):
        for val in row:
            if val is not None:
                parts.append(str(val))
    return " ".join(parts)


if __name__ == "__main__":
    path = "test.xlsx"  # replace with your Excel file
    print(get_read_data(path)) 
