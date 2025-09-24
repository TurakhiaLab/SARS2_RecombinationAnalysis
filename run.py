"""
Script to fetch and generate all the data used in recombination analysis.
"""

from notebooks.util import *

CONFIG = "config.yaml"


def main():
    config = load_config(CONFIG)
    # Download necessary infection counts and mutation fitness data files
    download_data_files(config["DATA_DIR"])

    if config["RERUN_RIVET"]:
        print("Running RIVET.")
        run_rivet()

    if config["RERUN_CHRONUMENTAL"]:
        print("Generating Chronumental file.")
        run_chronumental(config["MAT"], config["METADATA"], config["DATA_DIR"])

    if config["RERUN_GENETIC_DIVERSITY"]:
        print("Generating standing genetic diversity file.")
        run_diversity()

    if config["RERUN_FITNESS"]:
        print("Generating fitness results")
        run_fitness()

    print(
        "All data files needed for analysis have been written to: {}".format(
            config["DATA_DIR"]
        )
    )


if __name__ == "__main__":
    main()
