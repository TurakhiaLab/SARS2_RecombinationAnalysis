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

from util import Config

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


def main():
    config = Config(CONFIG)
    data_dir = config.DATA_DIR
    # Ensure data directory is found
    if not os.path.isdir(data_dir):
        raise FileNotFoundError(f"Data Directory not found: '{data_dir}'")

    # Get amino acid mutation fitness scores from PyR0
    mutation_fitness_scores = get_fitness_scores(config.PYRO_MUTATIONS_FILE)
    refseq = load_reference_sequence_modified(data_dir, "reference.fasta")

    # Get RIVET-inferred recombinant trios vcf
    nt_mutations = get_nt_mutations(config.RIVET_VCF_FILE)

    # Calculate fitness scores for all recombinant trios in RIVET results file,
    # write results to intermediate fitness file
    print(
        "Calculating fitness scores for all recombinant trios in: {}".format(
            config.RIVET_VCF_FILE
        )
    )

    # Set fitness outfile path
    OUTFILE = config.fitness_results_path
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
