from datetime import datetime
from dateutil.relativedelta import relativedelta
import polars as pl

# Pango recombinant lineage sample emergence and designation dates
DESIGNATION_DATES_FILENAME = "static/data/pango-designation-dates.csv"

def calculate_total_months(years, months):
    return years * 12 + months

def calculate_delay(df):
    delay_dict = {"Strain": list(), "Delay": list()}
    for row in df.iter_rows(named=True):
        emerged_date = datetime.strptime(row["DateEmerged"], "%Y-%m")
        designated_date = datetime.strptime(row["DateDesignated"], "%Y-%m")
        rdelta = relativedelta(designated_date, emerged_date)
        months_delay = calculate_total_months(rdelta.years, rdelta.months)
        delay_dict["Strain"].append(row["Strain"])
        delay_dict["Delay"].append(months_delay)
    delay_df = pl.from_dict(delay_dict)
    return df.join(delay_df, on="Strain")


def df(filename, delim=","):
    return pl.read_csv(filename, separator=delim)

def to_csv(df, filename):
    df.write_csv(filename)

def main():
    OUTFILE = "static/data/pango_recombinant_dates.csv"
    dates_df = df(DESIGNATION_DATES_FILENAME)
    delay_df = calculate_delay(dates_df)
    to_csv(delay_df, OUTFILE)

if __name__ == "__main__":
    main()
