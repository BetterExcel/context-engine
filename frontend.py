import streamlit as st
import pandas as pd
import numpy as np

# Sample data
df = pd.DataFrame(
    np.random.randint(1, 100, size=(10, 5)),
    columns=list("ABCDE")
)

st.title("📊 Table Cell Selection and Visualization")

# Show table
st.write("### Table")
st.dataframe(df, use_container_width=True)

# Let user select rows and columns
rows = st.multiselect("Select rows (index)", df.index.tolist())
cols = st.multiselect("Select columns", df.columns.tolist())

if rows and cols:
    selected_df = df.loc[rows, cols]
    
    st.write("### Selected Cells")
    st.dataframe(selected_df)

    # Visualization
    st.write("### Visualization of Selected Values")
    st.bar_chart(selected_df)
else:
    st.info("Select at least one row and one column to see results.")
