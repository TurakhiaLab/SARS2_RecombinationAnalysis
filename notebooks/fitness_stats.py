"""
Script run by `circulating-fitness-stats` pixi task to generate basic statistics for the fitness of all circulating samples for each month.
"""

import numpy as np
import math
import time
import os
import pickle
import statistics
import polars as pl
from cyvcf2 import VCF
from third_party.nuc_mutations_to_aa_mutations_modified import (
    nuc_mutations_to_aa_mutations_modified,
    load_reference_sequence_modified,
)
from util import (
    Config,
    download_data_files,
    get_chronumental_dates,
    get_months,
    get_fitness_scores,
    partition_samples_by_month,
)

CONFIG = "config.yaml"
CACHED_SAMPLE_MUTATIONS_FILE = "all_sample_mutations.parquet"


def compute_fitness(aa_mutations, mutations_r_ra):
    """
    TODO:
    """
    fitness = 0.0
    for m in aa_mutations:
        # Exclude any unranked mutations
        if m not in mutations_r_ra:
            continue
        fitness += mutations_r_ra[m]
    return 1 + fitness


def calculate_fitness_stats(
    config, mutations_file_path, refseq, mutation_fitness_scores, samples_by_month
):
    """
    TODO:
    """
    month_mapping = pl.DataFrame(
        [
            {"sample_id": sample, "month": month}
            for month, samples in samples_by_month.items()
            for sample in samples
        ]
    )
    mutations_df = pl.read_parquet(mutations_file_path)
    joined_df = mutations_df.join(month_mapping, on="sample_id", how="inner")
    total_samples = joined_df.height

    # Batch size of samples to process for logging
    batch_size = 50_000
    print(f"Starting fitness computation for {total_samples} total samples...")
    start_time = time.time()
    batch_start_time = start_time

    scores = {month: [] for month in samples_by_month.keys()}
    for i, row in enumerate(joined_df.iter_rows(named=True)):
        month = row["month"]
        nt_mutations = row["mutations"]
        aa_mutations = nuc_mutations_to_aa_mutations_modified(refseq, nt_mutations)
        sample_fitness = compute_fitness(aa_mutations, mutation_fitness_scores)
        scores[month].append(sample_fitness)
        # Logging
        if (i + 1) % batch_size == 0:
            current_time = time.time()
            elapsed_batch = current_time - batch_start_time
            elapsed_total = current_time - start_time
            print(
                f"Processed {i + 1}/{total_samples} samples... "
                f"[Batch time: {elapsed_batch:.2f}s | Total time: {elapsed_total:.2f}s]"
            )
            batch_start_time = current_time

    total_time = time.time() - start_time
    print(
        f"Finished computing all {total_samples} samples in {total_time:.2f} seconds."
    )
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
        "LogPercentile99.99",
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
            str(math.log(percentile_99_99)),
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
    print("Using fitness model: ", config.CALCULATE_FITNESS_USING)
    mutation_fitness_scores = get_fitness_scores(config)
    refseq = load_reference_sequence_modified(data_dir, "reference.fasta")

    # Get months of each sample from Chronumental file
    sample_months = get_chronumental_dates(config.CHRONUMENTAL_FILE)
    print("Finished loading Chronumental dates")
    samples_by_month = partition_samples_by_month(sample_months)

    mutations_file_path = os.path.join(data_dir, CACHED_SAMPLE_MUTATIONS_FILE)
    scores = calculate_fitness_stats(
        config, mutations_file_path, refseq, mutation_fitness_scores, samples_by_month
    )
    outfile = config.get_fitness_stats_outfile()
    write_fitness_stats(scores, outfile)
    print("All sample monthly fitness stats written to: ", outfile)


if __name__ == "__main__":
    main()
