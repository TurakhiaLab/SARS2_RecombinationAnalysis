"""
Script to plot the Pearson correlation matrix for Figure 1 Panel c,
comparing the number of detectable recombinant lineages,
the standing genetic diversity, and the number of infections.
"""

from string import ascii_letters
import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import argparse

# Plot settings
sns.set_theme(style="white")
sns.set(font_scale=1.5)
SAVE_AS = "panelc.svg"


def plot(filename, save_as):
    """
    Plot a Pearson correlation matrix using Seaborn heatmap.

    Parameters
    ----------
    filename: str
        The input data file (CSV) containing the recombinant lineage, diversity and infections data.

    save_as: str
        The name of the file (.svg) to save the plot as.
    """
    df = pd.read_csv(filename)
    df = df.drop(columns="Month")

    # Compute the correlation matrix
    corr = df.corr()
    mask = np.triu(np.ones_like(corr, dtype=bool))
    f, ax = plt.subplots(figsize=(14, 11))
    cmap = sns.diverging_palette(50, 255, sep=1, as_cmap=True)

    sns.heatmap(
        corr,
        cmap=cmap,
        mask=mask,
        center=0,
        square=True,
        annot=True,
        fmt=".3f",
        linewidths=0.5,
        cbar_kws={"shrink": 0.5},
    )
    f.savefig(save_as, format="svg", dpi=1200)


def main():
    parser = argparse.ArgumentParser(
        description="Script to create Pearson correlation matrix plot for Figure 1 Panel c."
    )
    parser.add_argument("--stats", "-s", required=True, help="Path to data (CSV) file.")
    args = parser.parse_args()
    plot(args.stats, SAVE_AS)


if __name__ == "__main__":
    main()
