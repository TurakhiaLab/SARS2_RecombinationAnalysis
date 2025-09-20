"""
Helper methods to perform the recombinant analysis in 'analysis.ipynb' notebook.
"""

import polars as pl
from datetime import datetime
import pickle
import os
import pprint
import pandas as pd
import yaml
import time
import pyarrow


RIVET_CONFIG = {
    "RECOMB_NODE_ID_COL": "Recombinant Node ID",
    "QC_FLAG_COL": "Quality Control (QC) Flags",
    "PASS_FLAG": "PASS",
    "INDEL_FLAG": "Too_many_mutations_near_INDELs",
}


def get_months():
    """
    Get a list of all the months considered in this analysis.

    Returns
    ----------
    List[str]
        The list of months (str) considered in the analysis.
    """
    years = ["2020", "2021", "2022", "2023"]
    months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
    month_bins = []
    for y in years:
        for m in months:
            month = y + "-" + m
            # If the last time interval bin reached
            if month == "2020-01":
                continue
            if month == "2023-03":
                return month_bins
            # Add month, and return
            month_bins.append(y + "-" + m)


MONTHS = get_months()


def load_config(config_filename):
    """
    Load YAML configuration file containing dataset file names and other analysis/notebook configuration parameters.

    Parameters
    ----------
    config_filename: str
        The name of the YAML configuration file to load.

    Returns
    ----------
    Dict
        The Dictionary containing all the configuration parameters.
    """
    with open(config_filename, "r") as file:
        data = yaml.safe_load(file)
    return data


def date_to_month(date):
    """
    Convert Datetime to a month as a string. eg) "2020-03"

    Parameters
    ----------
    date: Datetime
        The Datetime to convert to a month (str).

    Returns
    ----------
    str
        The month as a string.
    """
    return str(date.year) + "-" + str(f"{date.month:02d}")


def load_df(filename, delim=","):
    """
    Load a DSV file into a Polars DataFrame.

    Parameters
    ----------
    filename: str
        The name of the DSV file to load into a Polars DataFrame.
    delim: str (optional)
        The type of delimiter-separated file, which defaults to comma-separated values (CSV).

    Returns
    ----------
    DataFrame
        The loaded Polars DataFrame object.
    """
    return pl.read_csv(filename, separator=delim)


def get_passing_recombs(df):
    """
    Get the set of recombinant node ids inferred by RIVET with the 'PASS' QC flag.

    Parameters
    ----------
    df: Polars DataFrame
        The DataFrame object loaded from the RIVET results file.

    Returns
    ----------
    Set(str)
        The set of RIVET-inferred recombinant lineage node ids with the 'PASS' QC flag.
    """
    nodes = set()
    for row in df.iter_rows(named=True):
        qc_flags = set(row[RIVET_CONFIG["QC_FLAG_COL"]].split(","))
        recomb_node = row[RIVET_CONFIG["RECOMB_NODE_ID_COL"]]
        # Remove any empty strings in list
        if "" in qc_flags:
            qc_flags.remove("")
        # Collect all passing recombinant nodes
        if RIVET_CONFIG["PASS_FLAG"] in qc_flags:
            nodes.add(recomb_node)
    return nodes


def add_indel_flagged_recombs(df, passing_nodes):
    """
    Add the RIVET-inferred recombinant nodes with the 'Too_many_mutations_near_INDELs' QC flag,
    to the set of 'PASS' nodes.

    The function does not return a value, but adds elements to the 'passing_nodes' set.

    Parameters
    ----------
    df: Polars DataFrame
        The DataFrame object loaded from the RIVET results file.

    passing_nodes: Set(str)
        The set of RIVET recombinant node ids with the 'PASS' QC flag.

    """
    for row in df.iter_rows(named=True):
        qc_flags = set(row[RIVET_CONFIG["QC_FLAG_COL"]].split(","))
        recomb_node = row[RIVET_CONFIG["RECOMB_NODE_ID_COL"]]
        # Remove any empty strings in list
        if "" in qc_flags:
            qc_flags.remove("")

        # Add all recombinant nodes with 'Too_many_mutations_near_INDELs' QC flag only
        if (
            len(qc_flags) == 1
            and RIVET_CONFIG["INDEL_FLAG"] in qc_flags
            and recomb_node not in passing_nodes
        ):
            passing_nodes.add(recomb_node)


def get_included_recombinants(rivet_results_filename):
    """
    Collect all the RIVET-inferred recombinant node ids to be included in this analysis,
    including those with 'PASS' or 'Too_many_mutations_near_INDELs' QC flags.

    Parameters
    ----------
    rivet_results_filename: str
        The RIVET results file (.txt).

    Returns
    ----------
    Set(str)
        The set of RIVET-inferred recombinant lineage node ids to include in the analysis.
    """
    df = load_df(rivet_results_filename, delim="\t")
    unqiue_nodes = df[RIVET_CONFIG["RECOMB_NODE_ID_COL"]].unique()
    passing_nodes = get_passing_recombs(df)
    add_indel_flagged_recombs(df, passing_nodes)
    return passing_nodes


def get_chronumental_dates(chronumental_filename):
    """
    Load the Chronumental results file (TSV) and build a dictionary mapping the sample names to
    their inferred emergence month.
    Since the dictionary takes awhile to build, cache it on disk as a pickled object after first
    building it, and reload the dictionary object on subsequent calls.

    Parameters
    ----------
    chronumental_filename: str
        The Chronumental results file (TSV).

    Returns
    ----------
    Dict
        The dictionary of samples (tips and internal node ids) to their inferred months.
    """
    CACHE_PATH = chronumental_filename + ".pkl"
    # Check if chronumental dates object cached
    if os.path.exists(CACHE_PATH):
        print("Loading chronumental object from disk cache: ", CACHE_PATH)
        with open(CACHE_PATH, "rb") as f:
            sample_months_object = pickle.load(f)
        print("Chronumental dates loaded.")
        return sample_months_object

    df = load_df(chronumental_filename, delim="\t")
    SAMPLE_COL = "strain"
    DATE_COL = "predicted_date"
    sample_months = dict()
    for row in df.iter_rows(named=True):
        sample = row[SAMPLE_COL]
        date = row[DATE_COL]
        formatted_date = datetime.strptime(date, "%Y-%m-%d %H:%M:%S.%f")
        month = date_to_month(formatted_date)

        # Ensure that month string properly formatted
        if len(month) != 7:
            print(formatted_date)
            print(f"{formatted_date.month:02d}")
            print(month)
            exit(1)

        if sample not in sample_months.keys():
            sample_months[sample] = month
        else:
            print("Error, repeated sample!")
            exit(1)

    # Save chronumental lookup table on disk as pickled python dict
    print("Saving chronumental dates map on disk: ", chronumental_filename + ".pkl")
    with open(chronumental_filename + ".pkl", "wb") as file:
        pickle.dump(sample_months, file)

    return sample_months


def filter_recombs_to_date_range(nodes_to_consider, sample_months):
    """
    Take the list of filtered RIVET-inferred recombinant nodes by QC flags, and produce a further filtered
    list of recombinant node ids within the desired date range, specified in the 'MONTHS' list.

    Parameters
    ----------
    nodes_to_consider: Set(str)
        The set of RIVET-inferred recombinant nodes with either the 'PASS' or only the 'Too_many_mutations_near_INDELs'
        QC flag.

    sample_months: Dict[str, str]
        The dictionary of samples (tips and internal node ids) to their inferred months.

    Returns
    ----------
    List[str]
        The list of RIVET-inferred recombinant nodes, with either the 'PASS' or only the 'Too_many_mutations_near_INDELs'
        QC flag and within the months in the 'MONTHS' list.
    """
    nodes = []
    for node in nodes_to_consider:
        month = sample_months[node]
        if month not in MONTHS:
            continue
        nodes.append(node)
    return nodes


def get_mutation_rankings(filename):
    """
    Load the PyR0 'mutations.tsv' file containing the ranked amino acid mutation fitness scores
    into a DataFrame object.

    Parameters
    ----------
    filename: str
        The name of the PyR0 mutations fitness file.

    Returns
    ----------
    DataFrame
        The loaded DataFrame containing the amino acid mutation fitness data.
    """
    print("Loading PyR0 amino acid mutation ranking scores from file: ", filename)
    df = load_df(filename, delim="\t")
    return df


def get_case_counts(filename):
    """
    Load the JHU case count file (CSV) and extract the number of confirmed cases for each month
    considered in this analysis.

    Parameters
    ----------
    filename: str
        The name of the JHU CSV file containing time-series data of global SARS-CoV-2 confirmed cases.

    Returns
    ----------
    Dict[str, int]
        A dictionary mapping the month to the confirmed number of global SARS-CoV-2 cases recorded for that month.
    """

    months = [
        "2/29/20",
        "3/31/20",
        "4/30/20",
        "5/31/20",
        "6/30/20",
        "7/31/20",
        "8/31/20",
        "9/30/20",
        "10/31/20",
        "11/30/20",
        "12/31/20",
        "1/31/21",
        "2/28/21",
        "3/31/21",
        "4/30/21",
        "5/31/21",
        "6/30/21",
        "7/31/21",
        "8/31/21",
        "9/30/21",
        "10/31/21",
        "11/30/21",
        "12/31/21",
        "1/31/22",
        "2/28/22",
        "3/31/22",
        "4/30/22",
        "5/31/22",
        "6/30/22",
        "7/31/22",
        "8/31/22",
        "9/30/22",
        "10/31/22",
        "11/30/22",
        "12/31/22",
        "1/31/23",
        "2/28/23",
    ]
    assert len(MONTHS) == len(months)

    print("Loading case count data from file: ", filename)
    df = load_df(filename)
    month_counts = dict()
    i = 0
    month_sum = 0
    # Start previous month count as number of cases at end of January 2020
    previous_count = df["1/31/20"].sum()
    for month in months:
        count = df[month].sum()
        month_counts[MONTHS[i]] = count - previous_count
        i += 1
        previous_count = count
    # pprint.pprint(sorted(month_counts.items(), key=lambda item: item[1]))
    return month_counts


def get_genetic_diversity_scores(filename):
    """
    Load the standing genetic diversity scores file (CSV) produced by RIVET into a DataFrame object.
    considered in this analysis.

    Parameters
    ----------
    filename: str
        The name of the standing genetic diversity file.

    Returns
    ----------
    DataFrame
        A DataFrame with the standing genetic diversity data.
    """
    print("Loading standing genetic diversity scores from file: ", filename)
    df = load_df(filename)
    return df


def merge_dictionary_to_df(df, dictionary, join_on):
    dict_df = pl.from_dict(dictionary)
    return df.join(dict_df, on=join_on)


def num_recombs_per_month(final_recomb_nodes, sample_months, merged_df):
    """
    Given the list of RIVET-inferred recombinant node ids considered, count the number
    that emerged during each month, using the Chronumental-inferred dates.

    Parameters
    ----------
    final_recomb_nodes: List[str]
        The list of RIVET-inferred recombinant node ids considered in this analysis.

    sample_months: Dict[str, str]
        The dictionary of samples (tips and internal node ids) to their inferred months.

    merged_df: DataFrame
        A DataFrame object containing the standing genetic diversity and case count data.

    Returns
    ----------
    DataFrame
        A merged DataFrame with number of recombinant lineages that emereged each month,
        merged with the standing genetic diversity and case count data.
    """
    recombs_per_month = dict()
    for node in final_recomb_nodes:
        if node not in sample_months.keys():
            print("Chronumental date for node not found!")
            exit(1)
        month = sample_months[node]

        if month in recombs_per_month.keys():
            recombs_per_month[month] += 1
        else:
            recombs_per_month[month] = 1
    merged_df = merge_dictionary_to_df(
        merged_df,
        {
            "Month": recombs_per_month.keys(),
            "NumRecombsDetectedByMonth": recombs_per_month.values(),
        },
        "Month",
    )
    # print("Merged df: ", merged_df.sort("NumRecombsDetectedByMonth"))
    return merged_df


def get_recombinant_nodes(rivet_results_filename, sample_months):
    """
    Get all the RIVET-inferred recombinant nodes to be included in this study,
    considering the QC flags and inferred emergence dates.

    Parameters
    ----------
    rivet_results_filename: str
        The RIVET results file.

    sample_months: Dict[str, str]
        The dictionary of samples (tips and internal node ids) to their inferred months.

    Returns
    ----------
    List[str]
        The list of RIVET-inferred recombinant nodes, with either the 'PASS' or only the 'Too_many_mutations_near_INDELs'
        QC flag and within the months in the 'MONTHS' list.
    """
    # Get all recombinant nodes with 'PASS' or only 'indel' flag
    nodes_to_consider = get_included_recombinants(rivet_results_filename)
    final_recomb_nodes = filter_recombs_to_date_range(nodes_to_consider, sample_months)
    return final_recomb_nodes


def write_results(outfile):
    pass
