"""
Script run by `circulating-fitness-stats` pixi task to generate basic statistics for the fitness of all circulating samples for each month.
"""
import numpy as np
import math
import os
import pickle
import dbm
import statistics
from cyvcf2 import VCF
from third_party.nuc_mutations_to_aa_mutations_modified import (
    nuc_mutations_to_aa_mutations_modified,
    load_reference_sequence_modified,
)

from util import Config, download_data_files, get_chronumental_dates, get_months

CONFIG = "config.yaml"
PICKLED_SAMPLE_MUTATIONS_FILE = "all_sample_mutations.pkl"

def get_fitness_scores(mutations_filename):
    """
    TODO:
    """
    r_ra = {}
    fp = open(mutations_filename, "r")
    # Skip over file header
    next(fp)
    for line in fp:
        splitline = line.split("\t")
        rank = int(splitline[0])
        strain = splitline[1]
        delta_log_R = round(float(splitline[4]), 10)
        r_ra[strain] = delta_log_R
    fp.close()
    return r_ra


def compute_fitness(aa_mutations, mutations_r_ra):
    """
    TODO:
    """
    # Calculate fitness of sample given additivity of mutations in this model
    fitness = 0.0
    for m in aa_mutations:
        # Exclude any mutations unranked by PyR0
        if m not in mutations_r_ra.keys():
            continue
        fitness += mutations_r_ra[m]
    return float(math.exp(fitness))


def calculate_fitness_stats(mutations_file_path, refseq, mutation_fitness_scores, sample_months):
    """
    TODO:
    """
    scores = dict()
    # Collecting samples fitness scores for each month
    months = get_months()
    for month in months:
        scores[month] = []

    try:
        with dbm.open(mutations_file_path, 'r') as db:
            for key in db:
                month = sample_months[key.decode('utf-8')]
                value = pickle.loads(db[key])
                nt_mutations = list(value['mutations'])

                # Translate to amino acid mutations
                aa_mutations = nuc_mutations_to_aa_mutations_modified(refseq, nt_mutations)

                sample_fitness = compute_fitness(aa_mutations, mutation_fitness_scores)
                if month in scores.keys():
                    scores[month].append(sample_fitness)

    except dbm.error as e:
        print(f"dbm error: {e}")
        raise SystemExit(1)

    return scores

def write_fitness_stats(data, outfile):
    """
    TODO
    """
    fp_out = open(outfile, "w")

    COLUMNS = [
    "Month",
    "Mean",
    "LogMean",
    "Median",
    "LogMedian",
    "Max",
    "LogMax",
    "StandardDeviation",
    "LogStandardDeviation",
    "Percentile50",
    "LogPercentile50",
    "Percentile75",
    "LogPercentile75",
    "Percentile90",
    "LogPercentile90",
    "Percentile99",
    "LogPercentile99",
    "Percentile99.99",
    "LogPercentile99.99"
    ]

    HEADER = ",".join(COLUMNS)
    fp_out.write(HEADER + "\n")
    for month, scores in data.items():
        mean = statistics.mean(scores)
        log_mean = math.log(mean)
        median = statistics.median(scores)
        log_median = math.log(median)
        max_ = max(scores)
        std_dev = statistics.stdev(scores) 
        percentile_50 = np.percentile(scores, 50)
        percentile_75 = np.percentile(scores, 75)
        percentile_90 = np.percentile(scores, 90)
        percentile_99 = np.percentile(scores, 99)
        percentile_99_99 = np.percentile(scores, 99.99)
        ROW = [
            month,
            str(mean),
            str(log_mean),
            str(median),
            str(log_median),
            str(max_),
            str(math.log(max_)),
            str(std_dev),
            str(math.log(std_dev)),
            str(percentile_50),
            str(math.log(percentile_50)),
            str(percentile_75),
            str(math.log(percentile_75)),
            str(percentile_90),
            str(math.log(percentile_90)),
            str(percentile_99),
            str(math.log(percentile_99)),
            str(percentile_99_99),
            str(math.log(percentile_99_99))
        ]
        fp_out.write(",".join(ROW) + "\n")

def main():
    config = Config(CONFIG)
    data_dir = config.DATA_DIR

    # Ensure data directory is found
    if not os.path.isdir(data_dir):
        raise FileNotFoundError(f"Data Directory not found: '{data_dir}'")

    # Download the PyR0 ranked mutations file
    download_data_files(config.DATA_DIR)

    # Get amino acid mutation fitness scores from PyR0
    mutation_fitness_scores = get_fitness_scores(config.PYRO_MUTATIONS_FILE)
    refseq = load_reference_sequence_modified(data_dir, "reference.fasta")
    
    # Get months of each sample from Chronumental file
    sample_months = get_chronumental_dates(config.CHRONUMENTAL_FILE)

    mutations_file_path = os.path.join(data_dir, PICKLED_SAMPLE_MUTATIONS_FILE)
    scores = calculate_fitness_stats(mutations_file_path, refseq, mutation_fitness_scores, sample_months)
    write_fitness_stats(scores, config.MONTHLY_FITNESS_STATS_FILE)
    print("All sample monthly fitness stats written to: ", config.MONTHLY_FITNESS_STATS_FILE)


if __name__ == "__main__":
    main()
