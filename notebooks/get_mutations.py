"""
Script to get set of single-nucelotide mutations from each sample in the given MAT.
TODO: docs
"""
import bte
import os
from util import Config, download_data_files
import pickle
import dbm
import glob

CONFIG = "config.yaml"
PICKLED_SAMPLE_MUTATIONS_FILE = "all_sample_mutations.pkl"

def write_mutations_file(tree, filename):
    """
    # TODO:
    """
    leaves = tree.get_leaves_ids()

    with dbm.open(filename, 'c') as db:
        i = 0
        interval = 100_000
        for sample in leaves:
            # Get the nucleotide mutations for the given sample
            haplotype = tree.get_haplotype(sample)
            value = pickle.dumps({'mutations': haplotype})
            db[sample.encode('utf-8')] = value

            if (i + 1) % interval == 0:
                print(f"{i + 1} samples processed.")
            i+=1


def main():
    config = Config(CONFIG)
    data_dir = config.DATA_DIR

    # Ensure data directory is found
    if not os.path.isdir(data_dir):
        raise FileNotFoundError(f"Data Directory not found: '{data_dir}'")
    
    mutations_file_path = os.path.join(data_dir, PICKLED_SAMPLE_MUTATIONS_FILE)
    mutations_db_files = glob.glob(f'{mutations_file_path}.*')

    # Check if sample mutations database files have already been generated, if not create db
    if not mutations_db_files:
        # Load MAT
        print("Loading MAT file: ", config.MAT)
        tree = bte.MATree(config.MAT)
        write_mutations_file(tree, mutations_file_path)
    print("All samples mutations file written to disk: ", mutations_file_path)


if __name__ == "__main__":
    main()

