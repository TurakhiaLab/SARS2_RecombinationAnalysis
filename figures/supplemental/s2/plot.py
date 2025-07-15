"""
Script to create a linear regression plot comparing the earliest descendant date
obtained from sample metadata for each recombinant, verus the Chronumental-inferred
date for each recombinant.
"""
import numpy as np
import polars as pl
import seaborn as sns
import matplotlib.pyplot as plt
import os

# Dates data
DATES_FILENAME = "data/dates.csv"
# COLUMN NAMES
METADATA_COL = "MetadataMonth"
CHRON_COL = "ChronMonth"

PLOT_CONFIG = {
    "save_as": "img/date_scatter.svg",
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
    assert (len(metadata_dates) == len(chron_dates))
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


def scatterplot(df, encoded_labels, SAVE=None):
    """
    Plots a Seaborn Regression plot (with scatter plots enabled),
    with a kernel density estimate plot comparing the relationship between
    the Metadata dates and Chronumental inferred dates (months).

    Parameters
    ----------
    df: Polars DataFrame
        The input DataFrame containing the dates data.

    encoded_labels: Dict
        The mapping from dates to their integer encoded values.

    SAVE: str (optional)
        The output file path to save the plot as an SVG.
    """
    # Plot settings
    sns.set_style("darkgrid")
    sns.set_palette("muted")
    sns.set_context("paper")

    plt.figure(figsize=(12, 8))

    x_label = PLOT_CONFIG["x_label"]
    y_label = PLOT_CONFIG["y_label"]

    sns.kdeplot(x=df[x_label], y=df[y_label], fill=True)
    plt.tight_layout()
    sns.regplot(
        x=df[x_label],
        y=df[y_label],
        scatter=True,
        scatter_kws={"color": "orange"},
        line_kws={"color": "red"},
    )

    labels = list(encoded_labels.keys())
    int_encoded_labels = list(encoded_labels.values())
    plt.xticks(ticks=int_encoded_labels, labels=labels)
    plt.yticks(ticks=int_encoded_labels, labels=labels)
    plt.xticks(rotation=65)
    plt.xlabel(x_label, fontsize=12, labelpad=30, ha="center")
    plt.ylabel(y_label, fontsize=12, labelpad=30, ha="center")
    plt.grid(True, linestyle="--", linewidth=0.5, color="lightgrey", alpha=1.0)
    plt.tight_layout()
    # Save plot as SVG or display
    if SAVE:
        plt.savefig(SAVE, format="svg")
    else:
        plt.show()


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
    #scatterplot(df, encoded_labels) #, PLOT_CONFIG["save_as"])
    scatterplot(df, encoded_labels, PLOT_CONFIG["save_as"])
    print("Plot successfully saved: {}".format(PLOT_CONFIG["save_as"]))
    return

if __name__ == "__main__":
    main()
