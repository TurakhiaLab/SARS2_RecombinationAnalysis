"""
Main classes and methods used in the recombinant analysis in 'analysis.ipynb' notebook.
"""

from util import *
import sys


class RecombAnalysis:
    def __init__(self, config):
        self.config = config
        print("Loading all datasets for analysis")
        start_time = time.perf_counter()

        self.substitution_stats = get_substitution_stats(config.SUBTITUTION_SCORES)
        self.monthly_fitness_stats = get_monthly_fitness_stats(
            config.MONTHLY_FITNESS_STATS_FILE
        )

        recomb_data = get_recombinant_data(config.RECOMBINATION_STATS_FILE)
        # Calculate min-max normalization of fitness for each recombinant,
        # return DataFrame and write results to CSV file.
        OUTFILE = os.path.join(self.config.DATA_DIR, "recomb_fitness_normalized.csv")
        self.norm_fitness = calc_norm_fitness(recomb_data, OUTFILE)

        # Merge monthly fitness stats data with individual recombinant fitness stats data
        self.recomb_data = recomb_data.join(self.monthly_fitness_stats, on="Month")

        end_time = time.perf_counter()
        elapsed_time = end_time - start_time
        print(f"Data loaded, analysis ready. Elapsed time: {elapsed_time:.4f} seconds")

    def getNormFitness(self):
        """ """
        return self.norm_fitness

    def getSubstitutionFitnessStats(self):
        """ """
        return self.substitution_stats

    def getRecombinationFitnessStats(self):
        """ """
        return get_recombination_fitness_stats(self.recomb_data)

    def getRecombinationMinFitnessStats(self):
        """ """
        return get_recombination_min_fitness_stats(self.recomb_data)

    def getMonthlyStats(self):
        """ """
        return self.monthly_fitness_stats

    def getRecombData(self):
        """ """
        return self.recomb_data

    def toDataframe(self):
        """ """
        return self.df

    def getEpidemiologicalFactors(self):
        """
        TODO:
        """
        return get_epidemiological_df(self.recomb_data)

    def correlation_matrix(self):
        return self.df.to_pandas().corr()
