"""
#NOTICE: This file contains a slightly modified version of the 'nuc_mutations_to_aa_mutations' and 'load_reference_sequence' functions,
originally provided from the pyro-cov project.

# Original Source: https://github.com/broadinstitute/pyro-cov/blob/9f84acc3ddff9bcb55c8d1b77fd23204a4f54b8e/pyrocov/sarscov2.py

# This file is licensed under the Apache License, Version 2.0.
# A copy of the license is included in the third_party/pyro-cov directory.

# Modifications made to the original functions:
- The function load_reference_sequence now takes a reference filename and path to load the SARS-CoV-2 reference genome from a different path location.
- The function load_reference_sequence_modified now takes the SARS-CoV-2 reference sequence as an additional input instead of referencing a global variable.
"""

import os
import re
from collections import OrderedDict, defaultdict
from typing import Dict, List, Tuple

# NOTE: Unmodified versions of original pyrocov functions, imported
from pyrocov.sarscov2 import GENE_TO_POSITION, DNA_TO_AA


def load_reference_sequence_modified(data_dir, reference_file):
    # NOTE: Slightly modified from original version to take reference sequence file as a parameter,
    # coming from a different location (in 'data_dir' directory in top of repo)
    with open(os.path.join(data_dir, reference_file)) as f:
        ref = "".join(line.strip() for line in f if not line.startswith(">"))
    assert len(ref) == 29903, len(ref)
    return ref


def nuc_mutations_to_aa_mutations_modified(refseq, ms: List[str]) -> List[str]:
    # NOTE: Slightly modified from original version to take reference sequence as a parameter,
    # coming from a different location (in 'data' directory in top of repo)
    REFERENCE_SEQ = refseq
    ms_by_aa = defaultdict(list)

    for m in ms:
        # Parse a nucleotide mutation such as "A1234G" -> (1234, "G").
        # Note this uses 1-based indexing.
        if isinstance(m, str):
            position_nuc = int(m[1:-1])
            new_nuc = m[-1]
        else:
            # assert isinstance(m, pyrocov.usher.Mutation)
            position_nuc = m.position
            new_nuc = m.mut

        # Find the first matching gene.
        for gene, (start, end) in GENE_TO_POSITION.items():
            if start <= position_nuc <= end:
                position_aa = (position_nuc - start) // 3
                position_codon = (position_nuc - start) % 3
                ms_by_aa[gene, position_aa].append((position_codon, new_nuc))

    # Format cumulative amino acid changes.
    result = []
    for (gene, position_aa), ms in ms_by_aa.items():
        start, end = GENE_TO_POSITION[gene]

        # Apply mutation to determine new aa.
        pos = start + position_aa * 3
        pos -= 1  # convert from 1-based to 0-based
        old_codon = REFERENCE_SEQ[pos : pos + 3]
        new_codon = list(old_codon)
        for position_codon, new_nuc in ms:
            new_codon[position_codon] = new_nuc
        new_codon = "".join(new_codon)

        # Format.
        old_aa = DNA_TO_AA[old_codon]
        new_aa = DNA_TO_AA[new_codon]
        if new_aa == old_aa:  # ignore synonymous substitutions
            continue
        if old_aa is None:
            old_aa = "STOP"
        if new_aa is None:
            new_aa = "STOP"
        result.append(f"{gene}:{old_aa}{position_aa + 1}{new_aa}")  # 1-based
    return result
