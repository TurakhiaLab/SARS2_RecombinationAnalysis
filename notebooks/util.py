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
import urllib.request
import subprocess
import statistics
from cyvcf2 import VCF
import numpy as np
import math


RIVET_CONFIG = {
    "RECOMB_NODE_ID_COL": "Recombinant Node ID",
    "QC_FLAG_COL": "Quality Control (QC) Flags",
    "PASS_FLAG": "PASS",
    "INDEL_FLAG": "Too_many_mutations_near_INDELs",
}

# JHU Case count and PyR0 mutation fitness data urls
URLS = {
    "cases": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/refs/heads/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv",
    "fitness": "https://raw.githubusercontent.com/broadinstitute/pyro-cov/7d2829dc9c209399ecc188f2c87a881bdb09b221/paper/mutations.tsv",
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


class Config:
    RECOMB_TRIOS_FITNESS_FILE = "rivet_trios_fitness_data.csv"
    PANGO_RECOMBS_FILE = "pango_recombs_data.csv"

    def __init__(self, config_filename):
        config = load_config(config_filename)
        # Data directory name
        data_dir = config["DATA_DIR"]

        self.reference_filepath = os.path.join(data_dir, "reference.fasta")
        self.fitness_results_path = os.path.join(
            data_dir, Config.RECOMB_TRIOS_FITNESS_FILE
        )
        # RIVET output files
        self.RIVET_RESULTS_FILE = os.path.join(data_dir, config["RIVET_RESULTS_FILE"])
        self.RIVET_VCF_FILE = os.path.join(data_dir, config["RIVET_VCF_FILE"])

        self.CHRONUMENTAL_FILE = os.path.join(data_dir, config["CHRONUMENTAL_FILE"])
        self.PYRO_MUTATIONS_FILE = os.path.join(data_dir, config["PYRO_MUTATIONS_FILE"])
        self.CASES_FILE = os.path.join(data_dir, config["CASES_FILE"])
        self.GENETIC_DIVERSITY_FILE = os.path.join(
            data_dir, config["GENETIC_DIVERSITY_FILE"]
        )
        # Data for each detected recombinant
        self.RECOMBINATION_STATS_FILE = os.path.join(
            data_dir, config["RECOMBINATION_STATS_FILE"]
        )
        # Fitness stats each month for all circulating samples
        self.MONTHLY_FITNESS_STATS_FILE = os.path.join(
            data_dir, config["MONTHLY_FITNESS_STATS"]
        )
        # Fitness scores for all substitution mutations found in the MAT
        self.SUBTITUTION_SCORES = os.path.join(data_dir, config["SUBTITUTION_SCORES"])
        #self.__check_files_exist()
        self.MAT_DATE = os.path.join(data_dir, config["MAT_DATE"])
        self.MAT = os.path.join(data_dir, config["MAT"])
        self.METADATA = os.path.join(data_dir, config["METADATA"])
        self.PANGO_RECOMBS_FILE = os.path.join(data_dir, Config.PANGO_RECOMBS_FILE)

        self.DATA_DIR = data_dir
        # TODO: Old, can remove
        #self.RERUN_CHRONUMENTAL = config["RERUN_CHRONUMENTAL"]
        #self.RERUN_GENETIC_DIVERSITY = config["RERUN_GENETIC_DIVERSITY"]

    def __check_files_exist(self):
        for name, value in self.__dict__.items():
            if not os.path.exists(value):
                raise FileNotFoundError(f"The file '{value}' does not exist.")


def download(url, local_filepath):
    """
    Download the file from url and save as the given local filepath name.

    Parameters
    ----------
    url: str
        The url to the file to download.

    local_filepath: str
        The name of the path to store the downloaded file at locally.
    """
    try:
        filepath, headers = urllib.request.urlretrieve(url, local_filepath)
        print(f"File downloaded successfully to: {filepath}")

    except urllib.error.URLError as e:
        print(f"Error downloading file: {e.reason}")
        exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        exit(1)


def download_data_files(data_dir, override=False):
    """
    Download all the necessary data files for the analysis.

    Parameters
    ----------
    data_dir: str
        The local directory to download the data files into.

    override: bool (Optional)
        Whether or not to override the data file if it already exists locally.
    """
    # Ensure data directory is found
    if not os.path.isdir(data_dir):
        raise FileNotFoundError(f"Data Directory not found: '{data_dir}'")

    FILES = {
        "cases": "time_series_covid19_confirmed_global.csv",
        "fitness": "mutations.tsv",
    }
    for k, name in FILES.items():
        path = "{}/{}".format(data_dir, name)
        if not override and not os.path.exists(path):
            download(URLS[k], path)


def get_nt_mutations(vcf_filename):
    """
    TODO:
    """
    print("Parsing VCF file: {}".format(vcf_filename))
    vcf_reader = VCF(vcf_filename)

    samples = vcf_reader.samples
    positions = []
    ref_positions = {}
    nodes_ids = {_id: [] for _id in samples}

    for record in vcf_reader:
        # Report the position
        positions.append(str(record.POS))
        alleles_indexes = np.nonzero(record.gt_types)
        genotype_array = record.gt_bases
        for i in np.nditer(alleles_indexes):
            sample_name = samples[i]
            ref = str(record.REF)
            assert len(ref) == 1
            pos = str(record.POS)
            alt = genotype_array[i]
            assert len(alt) == 1
            new_nt_string = ref + pos + alt
            nodes_ids[sample_name].append(new_nt_string)
    return nodes_ids


def subprocess_runner(command):
    """
    Run the given string command as a subprocess.

    Parameters
    ----------
    command: List[str]
        The full command to run, including args.

    Returns
    ----------
    Dict
        The result of running the command as a subprocess.
    """
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        if result.stderr:
            print("result.stderr: ", result.stderr)
            exit(1)
        return result

    except Exception as e:
        print(f"Error occurred: {e}")
        exit(1)


def matUtils_extract_newick(mat, data_dir):
    """
    Run a matUtils extract command to extract the MAT as a Newick Tree file (.nwk).

    Parameters
    ----------
    mat: str
        The path to the MAT (.pb) file.

    data_dir: str
        The path to the data directory.

    Returns
    ----------
    str
        The path to the extracted Newick Tree file.
    """
    root, extension = os.path.splitext(mat)
    newick_tree_path = "{}/{}".format(data_dir, root + ".nwk")
    cmd = [
        "matUtils",
        "extract",
        "-i",
        "{}".format(mat),
        "-t",
        "{}".format(newick_tree_path),
        "-d",
        "{}".format(data_dir),
    ]
    result = subprocess_runner(cmd)
    return newick_tree_path


def check_files_exist(file_list):
    """
    Check that all the files in the given list exist.

    Parameters
    ----------
    file_list: List[str]
        The list of filenames to check if they actually exist.

    Returns
    ----------
    bool
        Returns True all the files in the list exist, otherwise False.
    """
    for path in file_list:
        if not os.path.exists(path):
            print("File not found: ", path)
            return False
    return True


def get_epidemiological_df(df):
    """ """
    epi_df = df.select(
        "Month", "DiversityScore", "Infections", "NumRecombsDetectedByMonth"
    ).unique(subset=["Month"])
    return epi_df


def load_recombinant_data(
    passing_rows,
    metadata=[
        "Recombinant Node ID",
        "Recombinant Lineage",
        "Donor Lineage",
        "Acceptor Lineage",
        "Recomb Number Samples",
        "Donor Node ID",
        "Acceptor Node ID",
    ],
):
    """
    TODO:
    """
    df = pl.DataFrame(passing_rows)
    metadata = df.select(metadata)
    return metadata


def check_files(config):
    """
    TODO:
    Check the necessary analysis files to merge can be found.
    """
    # Files required for analysis notebooks
    FILES = [
        config.GENETIC_DIVERSITY_FILE,
        config.CASES_FILE,
        config.PYRO_MUTATIONS_FILE,
        config.CHRONUMENTAL_FILE,
        config.RIVET_RESULTS_FILE,
        config.RIVET_VCF_FILE,
    ]
    for file in FILES:
        path = os.path.join(config.DATA_DIR, file)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Required file path not found: '{path}'")


def calculate_parental_divergence(donor_nt_mutations, acceptor_nt_mutatons):
    """
    TODO:
    """
    return len(set(donor_nt_mutations).symmetric_difference(set(acceptor_nt_mutatons)))


def merge_datafiles_helper(
    recomb_metadata,
    sample_months,
    recomb_trios_fitness_df,
    genetic_diversity_by_month_df,
    case_counts_dict,
    recombs_per_month_dict,
    trios_nt_mutations_dict,
    outfile,
):
    """
    TODO
    """
    fp_out = open(outfile, "w")
    COLUMNS = [
        "Month",
        "Node",
        "Strain",
        "Score",
        "NumNT",
        "NumAA",
        "DiversityScore",
        "Infections",
        "NumRecombsDetectedByMonth",
        "UShERClusterSize",
        "LnScore",
        "DonorStrain",
        "DonorID",
        "DonorFitness",
        "AcceptorStrain",
        "AcceptorID",
        "AcceptorFitness",
        "RecombFitnessNormalizedByMaxParents",
        "ParentsHD",
    ]
    HEADER = ",".join(COLUMNS)
    fp_out.write(HEADER + "\n")
    for i, row in enumerate(recomb_metadata.iter_rows(named=True)):
        # Get information about recombinant and its fitness
        recomb_node = row["Recombinant Node ID"]
        month = sample_months[recomb_node]
        strain = row["Recombinant Lineage"]
        recomb_node_selection = recomb_trios_fitness_df.filter(
            pl.col("Node") == recomb_node
        )
        num_nt = recomb_node_selection["NumNT"].item()
        num_aa = recomb_node_selection["NumAA"].item()
        score = recomb_node_selection["Score"].item()
        ln_score = recomb_node_selection["LogScore"].item()
        recomb_cluster_size = row["Recomb Number Samples"]

        # Get epidemiological variables
        diversity_score = genetic_diversity_by_month_df.filter(
            pl.col("Month") == month
        )["Diversity"].item()
        num_cases = case_counts_dict[month]
        num_recombs_this_month = recombs_per_month_dict[month]

        # Get donor/acceptor information and fitness
        donor_id = row["Donor Node ID"]
        acceptor_id = row["Acceptor Node ID"]
        donor_strain = row["Donor Lineage"]
        acceptor_strain = row["Acceptor Lineage"]
        donor_fitness = recomb_trios_fitness_df.filter(pl.col("Node") == donor_id)[
            "Score"
        ].item()
        acceptor_fitness = recomb_trios_fitness_df.filter(
            pl.col("Node") == acceptor_id
        )["Score"].item()

        recomb_fitness_norm_by_max = score / max(donor_fitness, acceptor_fitness)
        parental_divergence = calculate_parental_divergence(
            trios_nt_mutations_dict[donor_id], trios_nt_mutations_dict[acceptor_id]
        )

        ROW = [
            month,
            recomb_node,
            strain,
            str(score),
            str(num_nt),
            str(num_aa),
            str(diversity_score),
            str(num_cases),
            str(num_recombs_this_month),
            str(recomb_cluster_size),
            str(ln_score),
            donor_strain,
            donor_id,
            str(donor_fitness),
            acceptor_strain,
            acceptor_id,
            str(acceptor_fitness),
            str(recomb_fitness_norm_by_max),
            str(parental_divergence),
        ]
        fp_out.write(",".join(ROW) + "\n")


def merge_datafiles(config):
    """
    TODO
    """
    print("Merging all files from analysis")
    check_files(config)

    # Get genetic diversity scores from file
    genetic_diversity_by_month = get_genetic_diversity_scores(
        config.GENETIC_DIVERSITY_FILE
    )
    # Get case count data from file
    case_counts = get_case_counts(config.CASES_FILE)

    # Load inferred emergence dates from Chronumental file
    sample_months = get_chronumental_dates(config.CHRONUMENTAL_FILE)

    # Get recombinant nodes from RIVET files
    recomb_nodes, passing_rows = get_recombinant_nodes(
        config.RIVET_RESULTS_FILE, sample_months
    )

    recomb_metadata = load_recombinant_data(passing_rows)

    # Calculate the number of recombinants that emerged each month
    recombs_per_month_dict = num_recombs_per_month(recomb_nodes, sample_months)
    assert sum(recombs_per_month_dict.values()) == len(recomb_nodes)

    # Load recombinant trios fitness file
    recomb_trios_fitness_df = get_recombinant_trios_fitness(config.fitness_results_path)

    trios_nt_mutations_dict = get_nt_mutations(config.RIVET_VCF_FILE)

    outfile = config.RECOMBINATION_STATS_FILE
    # Format and merge all results together
    merge_datafiles_helper(
        recomb_metadata,
        sample_months,
        recomb_trios_fitness_df,
        genetic_diversity_by_month,
        case_counts,
        recombs_per_month_dict,
        trios_nt_mutations_dict,
        outfile,
    )
    print("Recombination data written to: {}".format(outfile))


def get_recombinant_trios_fitness(fitness_results_path):
    """
    TODO:
    """
    trios_fitness_df = pl.read_csv(fitness_results_path)
    return trios_fitness_df


def run_rivet():
    """
    TODO:
    """
    print("running rivet")


def run_diversity():
    """
    TODO:
    """
    print("running rivetUtils diversity program")


def run_fitness(data_dir, fitness_outfile):
    """
    TODO:
    """
    RECOMB_TRIOS_FITNESS_FILE = "rivet_trios_fitness_data.csv"
    fitness_filepath = os.path.join(data_dir, RECOMB_TRIOS_FITNESS_FILE)
    OUTFILE_PATH = os.path.join(data_dir, fitness_outfile)
    fitness_df = pl.read_csv(fitness_filepath)
    print("Fitness file path: ", fitness_filepath)
    print("Fitness outfile path: ", OUTFILE_PATH)
    print(fitness_df)
    exit()


def run_chronumental(mat, metadata, data_dir):
    """
    Runs the Chronumental command that infers emergence dates for all samples/nodes in the MAT.

    Parameters
    ----------
    mat: str
        The name of the MAT (.pb) file.

    metadata: str
        The name of the metadata (.tsv) file that accompanies the MAT.

    data_dir: str
        The path to the data directory.

    """
    # Check that MAT and metadat file exist in data dir
    if not os.path.exists(mat):
        raise FileNotFoundError(
            f"The MAT file '{mat}' not found in data directory. Please copy the MAT file into 'data' directory."
        )
    if not os.path.exists(metadata):
        raise FileNotFoundError(
            f"The MAT metadata file '{metadata}' not found in data directory. Please copy the metadata file into 'data' directory."
        )

    # Get file paths required for Chronumental
    root, extension = os.path.splitext(mat)
    chron_output = os.path.join(data_dir, "chronumental_dates_{}.tsv".format(root))

    # Extract a Newick Tree file from the MAT first
    newick_tree_path = matUtils_extract_newick(mat, data_dir)
    metadata_path = os.path.join(data_dir, metadata)
    # Check that all file paths exist
    if not check_files_exist([newick_tree_path, metadata_path]):
        exit(1)

    # Chronumental settings
    REFERENCE_NODE = "CHN/Wuhan_IME-WH01/2019|MT291826.1|2019-12-30"
    STEPS = 2000

    # Chronumental takes Newick tree file and metadata file as inputs
    chron_cmd = [
        "chronumental",
        "--tree",
        "{}".format(newick_tree_path),
        "--dates",
        "{}".format(metadata_path),
        "--reference_node",
        "{}".format(REFERENCE_NODE),
        "--steps",
        "{}".format(STEPS),
        "--only_use_full_dates",
        "--use_gpu",
        "--dates_out",
        "{}".format(chron_output),
    ]
    result = subprocess_runner(chron_cmd)


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
    # Get project top level directory absolute path
    top_dir = os.path.dirname(os.path.abspath(config_filename))
    data_dir = data["DATA_DIR"]
    # Get absolute path to data directory
    data_dir_path = os.path.join(top_dir, data_dir)
    if not os.path.isdir(data_dir_path):
        raise FileNotFoundError(
            f"The data directory '{data_dir}' not found in project root."
        )

    # Replace data directory name with its absolute path
    data["DATA_DIR"] = data_dir_path
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


# TODO: Edit docs slightly to show that metadata df was returned...
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
    # Save the passing rows
    passing_rows = []
    nodes = set()
    for i, row in enumerate(df.iter_rows(named=True)):
        qc_flags = set(row[RIVET_CONFIG["QC_FLAG_COL"]].split(","))
        recomb_node = row[RIVET_CONFIG["RECOMB_NODE_ID_COL"]]
        # Remove any empty strings in list
        if "" in qc_flags:
            qc_flags.remove("")
        # Collect all passing recombinant nodes
        if RIVET_CONFIG["PASS_FLAG"] in qc_flags:
            nodes.add(recomb_node)
            passing_rows.append(row)
    return nodes, passing_rows


# TODO: Edit docs slightly to account for passing_rows
def add_indel_flagged_recombs(df, passing_nodes, passing_rows):
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
    for i, row in enumerate(df.iter_rows(named=True)):
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
            passing_rows.append(row)
    assert len(passing_rows) == len(passing_nodes)
    assert set([row["Recombinant Node ID"] for row in passing_rows]) == passing_nodes


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
    unique_nodes = df[RIVET_CONFIG["RECOMB_NODE_ID_COL"]].unique()
    passing_nodes, passing_rows = get_passing_recombs(df)
    add_indel_flagged_recombs(df, passing_nodes, passing_rows)
    return passing_nodes, passing_rows


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
        print("Loading Chronumental object from disk cache: ", CACHE_PATH)
        with open(CACHE_PATH, "rb") as f:
            sample_months_object = pickle.load(f)
        print("Chronumental dates loaded.")
        return sample_months_object

    print("Loading Chronumental dates file. This could take a couple minutes.")
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


# TODO: Edit signature, nodes_to_consider not needed anymore...
def filter_recombs_to_date_range(nodes_to_consider, passing_rows, sample_months):
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
    i = 0
    rows_to_remove = []
    for row in passing_rows:
        node = row["Recombinant Node ID"]
        month = sample_months[node]
        if month not in MONTHS:
            rows_to_remove.append(i)
            i += 1
            continue
        nodes.append(node)
        i += 1

    # Remove rows outside of date range
    for idx in sorted(rows_to_remove, reverse=True):
        passing_rows.pop(idx)
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


# def num_recombs_per_month(final_recomb_nodes, sample_months, merged_df):
def num_recombs_per_month(final_recomb_nodes, sample_months):
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
    # TODO: ^EDIT THE ABOVE DOCS
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
    return recombs_per_month
    """
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
    """


def get_recombination_min_fitness_stats(df):
    """
    TODO: docs
    TODO: Add a column in the results file for RecombFitnessNormalizedByMinParents
    """
    RECOMB_SCORE_COL = "Score"
    DONOR_SCORE_COL = "DonorFitness"
    ACCEPTOR_SCORE_COL = "AcceptorFitness"
    min_normalized_scores = []
    for row in df.iter_rows(named=True):
        recomb_score = row[RECOMB_SCORE_COL]
        donor_score = row[DONOR_SCORE_COL]
        acceptor_score = row[ACCEPTOR_SCORE_COL]
        min_parental_score = min(donor_score, acceptor_score)
        min_normalized_scores.append(recomb_score / min_parental_score)
    assert len(min_normalized_scores) == len(df)
    mean_fitness = statistics.mean(min_normalized_scores)
    std_dev_fitness = statistics.stdev(min_normalized_scores)
    return {"mean": mean_fitness, "stddev": std_dev_fitness}


def get_recombination_fitness_stats(df):
    """
    TODO: docs
    """
    mean_fitness = df.select(
        pl.col("RecombFitnessNormalizedByMaxParents").mean()
    ).item()
    std_dev_fitness = df.select(
        pl.col("RecombFitnessNormalizedByMaxParents").std()
    ).item()
    return {"mean": mean_fitness, "stddev": std_dev_fitness}


def get_substitution_stats(filename):
    """
    TODO
    """
    df = pl.read_csv(filename)
    scores = []
    for row in df.iter_rows(named=True):
        occ = row["Occurrence"]
        score = row["PyRoScore"]
        for i in range(0, occ):
            scores.append(score)
        scores.append(score)
    return {"mean": statistics.mean(scores), "stddev": statistics.stdev(scores)}


def get_monthly_fitness_stats(stats_filename):
    """
    TODO:
    """
    df = pl.read_csv(stats_filename)
    return df


def calc_norm_fitness(recomb_data_df, csv_outfile=None):
    """
    TODO:
    """

    def min_max_norm(score, max_x, min_x):
        """
        TODO:
        """
        if max_x == min_x:
            # In cases where the max(parents) = min(parents)
            return 0.5
        norm = (score - min_x) / (max_x - min_x)
        return norm

    df = pl.DataFrame(
        {
            "RecombID": pl.Series([], dtype=pl.String),
            "NormFitness": pl.Series([], dtype=pl.Float64),
            "Date": pl.Series([], dtype=pl.String),
        }
    )
    for row in recomb_data_df.iter_rows(named=True):
        month = row["Month"]
        recomb_id = row["Node"]
        recomb_fitness = row["Score"]
        donor_fitness = row["DonorFitness"]
        acceptor_fitness = row["AcceptorFitness"]
        min_max_fitness = min_max_norm(
            recomb_fitness,
            max(donor_fitness, acceptor_fitness),
            min(donor_fitness, acceptor_fitness),
        )
        df.vstack(
            pl.DataFrame(
                {"RecombID": recomb_id, "NormFitness": min_max_fitness, "Date": month}
            ),
            in_place=True,
        )
    assert len(df) == len(recomb_data_df)
    if csv_outfile is not None:
        df.write_csv(csv_outfile)
    return df


def get_recombinant_data(recombination_data_filename):
    """TODO"""
    df = pl.read_csv(recombination_data_filename)
    return df


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
    nodes_to_consider, passing_rows = get_included_recombinants(rivet_results_filename)
    final_recomb_nodes = filter_recombs_to_date_range(
        nodes_to_consider, passing_rows, sample_months
    )
    assert len(final_recomb_nodes) == len(passing_rows)
    assert set(final_recomb_nodes) == set(
        [row["Recombinant Node ID"] for row in passing_rows]
    )
    return final_recomb_nodes, passing_rows


def write_results(outfile):
    pass
