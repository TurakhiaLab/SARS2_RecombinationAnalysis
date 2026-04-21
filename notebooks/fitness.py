"""
TODO: docs
"""

import numpy as np
import math
import os
from cyvcf2 import VCF
from third_party.nuc_mutations_to_aa_mutations_modified import (
    nuc_mutations_to_aa_mutations_modified,
    load_reference_sequence_modified,
)
from util import Config, try_download, URLS, get_fitness_scores

CONFIG = "config.yaml"


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


def compute_fitness(aa_mutations, mutations_r_ra):
    """
    TODO:
    """
    # Calculate fitness of sample given additivity of mutations in this model
    fitness = 0.0
    for m in aa_mutations:
        # Exclude any unranked mutations
        if m not in mutations_r_ra:
            continue
        fitness += mutations_r_ra[m]
    return 1 + fitness


def main():
    config = Config(CONFIG)
    data_dir = config.DATA_DIR

    # Ensure data directory is found
    if not os.path.isdir(data_dir):
        raise FileNotFoundError(f"Data Directory not found: '{data_dir}'")

    print("Calculating fitness using: ", config.CALCULATE_FITNESS_USING)
    # Get amino acid mutation fitness scores from PyR0 or BVAS
    mutation_fitness_scores = get_fitness_scores(config)
    refseq = load_reference_sequence_modified(data_dir, "reference.fasta")

    # Get RIVET-inferred recombinant trios vcf
    nt_mutations = get_nt_mutations(config.RIVET_VCF_FILE)
    print(
        "Calculating fitness scores for all recombinant trios in: {}".format(
            config.RIVET_VCF_FILE
        )
    )

    # Set fitness outfile path
    OUTFILE = config.get_fitness_outfile()
    fp_out = open(OUTFILE, "w")
    COLUMNS = [
        "Node",
        "Score",
        "NumNT",
        "NumAA",
        "LogScore",
    ]
    HEADER = ",".join(COLUMNS)
    fp_out.write(HEADER + "\n")

    data = {}
    for node_id, nt_list in nt_mutations.items():
        num_nt_mutations = len(nt_list)
        aa_mutations = nuc_mutations_to_aa_mutations_modified(refseq, nt_list)
        num_aa_mutations = len(aa_mutations)
        node_fitness = compute_fitness(
            aa_mutations,
            mutation_fitness_scores,
        )
        out = [
            node_id,
            str(node_fitness),
            str(num_nt_mutations),
            str(num_aa_mutations),
            str(math.log(node_fitness)),
        ]
        fp_out.write(",".join(out) + "\n")
    fp_out.close()
    print("RIVET recombinant trios fitness file written: ", OUTFILE)


if __name__ == "__main__":
    main()
