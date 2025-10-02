"""
Script to fetch and generate all the data used in recombination analysis.
"""

from notebooks.util import *

CONFIG_FILENAME = "config.yaml"


def main():
    config = Config(CONFIG_FILENAME)
    # Download necessary infection counts and mutation fitness data files
    download_data_files(config.DATA_DIR)

    # TODO: Handle rivet separately
    # if config.RERUN_RIVET:
    #   print("Running RIVET.")
    #   run_rivet()

    if config.RERUN_CHRONUMENTAL:
        print("Generating Chronumental file.")
        run_chronumental(config.MAT, config.METADATA, config.DATA_DIR)

    if config.RERUN_GENETIC_DIVERSITY:
        print("Generating standing genetic diversity file.")
        run_diversity()

    if config.RERUN_CIRCULATING_FITNESS:
        print("Generating fitness results for all circulating samples.")
        # run_fitness(config["DATA_DIR"], config["RECOMBINATION_STATS_FILE"])

    print(
        "All data files needed for analysis have been written to: {}".format(
            config.DATA_DIR
        )
    )
    merge_datafiles(config)


if __name__ == "__main__":
    main()
