"""
Script to get set of single-nucelotide mutations from each sample in the given MAT.
TODO: docs
"""

import bte
import os
from util import Config, download_data_files, file_exists
import pickle
import glob
import pyarrow as pa
import pyarrow.parquet as pq

CONFIG = "config.yaml"
CACHED_SAMPLE_MUTATIONS_FILE = "all_sample_mutations.parquet"


def write_mutations_file(tree, filename):
    """"""
    leaves = tree.get_leaves_ids()
    # Batch size of samples to process for logging
    batch_size = 50_000
    sample_ids = []
    mutations_lists = []
    schema = pa.schema(
        [("sample_id", pa.string()), ("mutations", pa.list_(pa.string()))]
    )
    print("Writing output file: ", filename)
    with pq.ParquetWriter(filename, schema) as writer:
        for i, sample in enumerate(leaves):
            haplotype = tree.get_haplotype(sample)
            sample_ids.append(sample)
            mutations_lists.append([str(m) for m in haplotype])

            # Log
            if (i + 1) % batch_size == 0:
                batch_table = pa.Table.from_arrays(
                    [pa.array(sample_ids), pa.array(mutations_lists)], schema=schema
                )
                writer.write_table(batch_table)
                sample_ids.clear()
                mutations_lists.clear()
                print(f"{i + 1} samples processed.")

        if sample_ids:
            batch_table = pa.Table.from_arrays(
                [pa.array(sample_ids), pa.array(mutations_lists)], schema=schema
            )
            writer.write_table(batch_table)


def main():
    config = Config(CONFIG)
    data_dir = config.DATA_DIR

    # Ensure data directory is found
    if not os.path.isdir(data_dir):
        raise FileNotFoundError(f"Data Directory not found: '{data_dir}'")

    mutations_file_path = os.path.join(data_dir, CACHED_SAMPLE_MUTATIONS_FILE)

    # Check if sample mutations database files have already been generated, if not create db
    if not file_exists(mutations_file_path):
        if not file_exists(config.MAT):
            raise FileNotFoundError(f"MAT file not found: '{config.MAT}'")

        print("Loading MAT file: ", config.MAT)
        tree = bte.MATree(config.MAT)

        print(f"Writing mutations to {mutations_file_path}.")
        write_mutations_file(tree, mutations_file_path)
    else:
        print(f"Database already exists at: {mutations_file_path}")

    print("All samples mutations file written to disk: ", mutations_file_path)


if __name__ == "__main__":
    main()
