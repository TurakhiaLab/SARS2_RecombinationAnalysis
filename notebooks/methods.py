"""
Main classes and methods used in the recombinant analysis in 'analysis.ipynb' notebook.
"""

from util import *
import sys


class Config:
    def __init__(self, config_filename):
        config = load_config(config_filename)
        data_dir = config["DATA_DIR"]
        self.RIVET_RESULTS_FILE = os.path.join(data_dir, config["RIVET_RESULTS_FILE"])
        self.CHRONUMENTAL_FILE = os.path.join(data_dir, config["CHRONUMENTAL_FILE"])
        self.PYRO_MUTATIONS_FILE = os.path.join(data_dir, config["PYRO_MUTATIONS_FILE"])
        self.CASES_FILE = os.path.join(data_dir, config["CASES_FILE"])
        self.GENETIC_DIVERSITY_FILE = os.path.join(
            data_dir, config["GENETIC_DIVERSITY_FILE"]
        )
        self.__check_files_exist()
        self.MAT_DATE = os.path.join(data_dir, config["MAT_DATE"])
        self.DATA_DIR = data_dir

    def __check_files_exist(self):
        for name, value in self.__dict__.items():
            if not os.path.exists(value):
                raise FileNotFoundError(f"The file '{value}' does not exist.")


class RecombAnalysis:
    def __init__(self, config):
        self.config = config
        print("Loading all datasets for analysis")
        start_time = time.perf_counter()
        genetic_diversity_by_month = get_genetic_diversity_scores(
            config.GENETIC_DIVERSITY_FILE
        )
        mutations_fitness_df = get_mutation_rankings(config.PYRO_MUTATIONS_FILE)
        case_counts = get_case_counts(config.CASES_FILE)
        sample_months = get_chronumental_dates(config.CHRONUMENTAL_FILE)
        recomb_nodes = get_recombinant_nodes(config.RIVET_RESULTS_FILE, sample_months)

        merged_df = genetic_diversity_by_month.join(
            pl.from_dict(
                {"Month": case_counts.keys(), "Infections": case_counts.values()}
            ),
            on="Month",
        )
        merged_df = num_recombs_per_month(recomb_nodes, sample_months, merged_df)
        assert merged_df["NumRecombsDetectedByMonth"].sum() == len(recomb_nodes)
        self.df = merged_df

        end_time = time.perf_counter()
        elapsed_time = end_time - start_time
        print(f"Data loaded, analysis ready. Elapsed time: {elapsed_time:.4f} seconds")

    def toDataframe(self):
        """ """
        return self.df

    def correlation_matrix(self):
        return self.df.to_pandas().corr()
