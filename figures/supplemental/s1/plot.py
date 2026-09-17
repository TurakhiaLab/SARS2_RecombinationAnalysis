"""
Script to create a heatmap and linear regression plot comparing the earliest descendant date
obtained from sample metadata for each recombinant, verus the Chronumental-inferred
date for each recombinant.
"""

import numpy as np
import polars as pl
import seaborn as sns
import matplotlib.pyplot as plt
import os
from scipy import stats
from scipy.stats import pearsonr

# Dates data
DATES_FILENAME = "data/dates.csv"
# COLUMN NAMES
METADATA_COL = "MetadataMonth"
CHRON_COL = "ChronMonth"

PLOT_CONFIG = {
    "save_as": "img/date_heatmap.svg",
    "x_label": "Metadata Earliest Descendant Date (Month)",
    "y_label": "Chronumental Inferred Emergence Date (Month)",
}


# Helpers
def get_data(filename):
    """
    Loads the CSV data containing Metadata and Chronumental dates
    and produces two Numpy Arrays with the dates.

    Parameters
    ----------
    filename: str
        The input data file (CSV) containing the Metadata and Chronumental dates.

    Returns
    ----------
    Numpy Array
        The Metadata dates
    Numpy Array
        The Chronumental dates
    """
    df = pl.read_csv(filename)
    metadata_dates = df[METADATA_COL].to_numpy()
    chron_dates = df[CHRON_COL].to_numpy()
    assert len(metadata_dates) == len(chron_dates)
    return metadata_dates, chron_dates


def label_encode(arr1, arr2):
    """
    Loads the CSV data containing Metadata and Chronumental dates
    and produces two Numpy Arrays with the dates.

    Parameters
    ----------
    filename: str
        The input data file (CSV) containing the Metadata and Chronumental dates.

    Returns
    ----------
    Numpy Array
        The Metadata dates
    Numpy Array
        The Chronumental dates
    """
    from sklearn.preprocessing import LabelEncoder

    combined = np.concatenate((arr1, arr2))
    label_encoder = LabelEncoder()
    label_encoder.fit(combined)

    # Create a mapping from dates to int
    value_to_int_mapping = dict(
        zip(label_encoder.classes_, label_encoder.transform(label_encoder.classes_))
    )
    return value_to_int_mapping


def heatmap(df, encoded_labels, SAVE=None):
    """
    Plots a heatmap with a regression line comparing the
    relationship between metadata dates and Chronumental inferred dates.

    Parameters
    ----------
    df: Polars DataFrame
        The input DataFrame containing the dates data.

    encoded_labels: Dict
        The mapping from dates to their integer encoded values.

    SAVE: str (optional)
        The output file path to save the plot as an SVG.
    """
    sns.set_style("darkgrid")
    sns.set_context("paper")

    plt.figure(figsize=(12, 8))

    x_label = PLOT_CONFIG["x_label"]
    y_label = PLOT_CONFIG["y_label"]

    r_value, p_value = pearsonr(df[x_label], df[y_label])
    print(f"Pearson r: {r_value}, p-value: {p_value}")

    sns.histplot(
        data=df,
        x=x_label,
        y=y_label,
        discrete=(True, True),
        cbar=True,
        cbar_kws={"label": "Number of Recombinants"},
        cmap="Blues",
    )
    slope, intercept, r_value, p_value, std_err = stats.linregress(
        df[x_label], df[y_label]
    )

    sns.regplot(
        x=df[x_label],
        y=df[y_label],
        scatter=False,
        line_kws={
            "color": "red",
        },
    )

    min_val = min(df[x_label].min(), df[y_label].min())
    max_val = max(df[x_label].max(), df[y_label].max())
    plt.plot(
        [min_val, max_val],
        [min_val, max_val],
        color="grey",
        linestyle="--",
        label="x = y Reference",
    )
    labels = list(encoded_labels.keys())
    int_encoded_labels = list(encoded_labels.values())
    plt.xticks(ticks=int_encoded_labels, labels=labels, rotation=65)
    plt.yticks(ticks=int_encoded_labels, labels=labels)
    plt.xlabel(x_label, fontsize=12, labelpad=15, ha="center")
    plt.ylabel(y_label, fontsize=12, labelpad=15, ha="center")
    plt.legend(loc="upper left")
    plt.tight_layout()
    # Save plot as SVG or display
    if SAVE:
        plt.savefig(SAVE, format="svg")
    else:
        plt.show()

    print("Slope: ", slope)
    print("y-intercept: ", intercept)
    print("R-value: ", r_value)
    print("R-squared value: ", r_value**2)
    print("p-value: ", p_value)
    print("Std error: ", std_err)


def main():
    # Create output image directory, if doesn't exist
    if not os.path.isdir("img"):
        os.mkdir("img")

    metadata_dates_arr, chron_dates_arr = get_data(DATES_FILENAME)
    encoded_labels = label_encode(metadata_dates_arr, chron_dates_arr)
    chron_values = [encoded_labels[x] for x in chron_dates_arr]
    metadata_values = [encoded_labels[x] for x in metadata_dates_arr]
    df = pl.DataFrame(
        {PLOT_CONFIG["y_label"]: chron_values, PLOT_CONFIG["x_label"]: metadata_values}
    )
    heatmap(df, encoded_labels, PLOT_CONFIG["save_as"])
    print("Plot successfully saved: {}".format(PLOT_CONFIG["save_as"]))
    return


if __name__ == "__main__":
    main()
