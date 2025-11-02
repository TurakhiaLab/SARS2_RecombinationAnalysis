"""
Script to create a linear regression plot comparing the PyRo relative fitness scores against
the CovFit relative fitness scores for each recombinant in the dataset.
"""

import numpy as np
import polars as pl
import seaborn as sns
import matplotlib.pyplot as plt
import os
from scipy import stats

FILENAME = "static/data/pyro_vs_covfit_fitness.csv"
PYRO_COL = "PyRo"
COVFIT_COL = "CovFit"
PLOT_CONFIG = {
    "show": False,
    "save_as": "img/pyro_vs_covfit.svg",
    "x_label": "CovFit Relative Fitness",
    "y_label": "PyRo Relative Fitness (Normalized)",
}


def get_data(filename):
    """
    Loads the CSV data containing PyRo and CovFit fitness
    scores for all recombinant nodes considered,
    and produces two Numpy Arrays with the dates.

    Parameters
    ----------
    filename: str
        The input data file (CSV).

    Returns
    ----------
    Numpy Array (float)
        The PyRo fitness scores
    Numpy Array (float)
        The CovFit fitness scores
    """
    df = pl.read_csv(filename)
    pyro_scores = df[PYRO_COL].to_numpy()
    covfit_scores = df[COVFIT_COL].to_numpy()
    assert len(pyro_scores) == len(covfit_scores)
    return pyro_scores, covfit_scores


def plot(df):
    """
    Plots a Seaborn Regression plot (with scatter plots enabled),
    with a kernel density estimate plot comparing the relationship between
    the CovFit relative fitness scores and PyRo relative fitness scores,
    for all recombinants in the dataset.

    Parameters
    ----------
    df: Polars DataFrame
        The input DataFrame containing the dates data.
    """
    config = PLOT_CONFIG
    x_label = config["x_label"]
    y_label = config["y_label"]

    sns.set_style("darkgrid")
    sns.set_palette("muted")
    sns.set_context("paper")
    plt.figure(figsize=(15, 10))

    sns.kdeplot(
        x=df[x_label],
        y=df[y_label],
        fill=True,
    )
    sns.regplot(
        x=df[x_label],
        y=df[y_label],
        scatter=True,
        scatter_kws={"color": "orange"},
    )
    plt.xlabel(x_label, fontsize=12, labelpad=30, ha="center")
    plt.ylabel(y_label, fontsize=12, labelpad=30, ha="center")
    plt.grid(True, linestyle="--", linewidth=0.5, color="lightgrey", alpha=1.0)
    plt.tight_layout()
    if config["show"]:
        plt.show()
    else:
        plt.savefig(config["save_as"], format="svg")

    slope, intercept, r_value, p_value, std_err = stats.linregress(
        df[x_label], df[y_label]
    )
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

    pyro_scores, covfit_scores = get_data(FILENAME)
    df = pl.DataFrame(
        {
            PLOT_CONFIG["y_label"]: pyro_scores,
            PLOT_CONFIG["x_label"]: covfit_scores,
        }
    )
    plot(df)
    print("Plot successfully saved: {}".format(PLOT_CONFIG["save_as"]))


if __name__ == "__main__":
    main()
