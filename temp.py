import pandas as pd

# Read the CSV file
df = pd.read_csv("CollegePlacement.csv")

# Save as Excel
df.to_excel("graduate_employability.xlsx", index=False)

print("✅ Converted CSV to Excel")
