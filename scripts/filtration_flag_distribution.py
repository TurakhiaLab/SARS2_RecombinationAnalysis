"""
Script to determine the distribution of RIVET filtration flags applied to
Pango-designated inferred recombinants matching node.
"""
import polars as pl
import numpy as np
from pprint import pprint

RECOMB_DATA_FILE = "data/final_recombinants_2023-12-25.txt"
PANGO_RECOMB_LINEAGES_FILE = "data/pango_recombs_data.csv"
OUTFILE = "figures/supplemental/s4/data/rivet_pango_filtration.csv"

# Column names for RECOMB_DATA_FILE file
FILTRATION_COL = "Quality Control (QC) Flags"
RECOMB_ID_COL = "Recombinant Node ID"

# Helpers
def flatten_list(lst):
    flattened_lst = []
    for flag_list in lst:
        splitlist = flag_list.split(',')
        for flag in splitlist:
            flattened_lst.append(flag)
    return flattened_lst

def filtration_flag(recomb_id, df):
    pango_recombs_df = df.filter(pl.col(RECOMB_ID_COL) == recomb_id)
    if pango_recombs_df.is_empty():
        return None
    flags_list = pango_recombs_df.get_column(FILTRATION_COL).to_list()
    flags = flatten_list(flags_list)
    return list(filter(None, flags))

def get_key_by_value(dictionary, value_list):
    keys = []
    transposed_dict = {value: key for key, value in dictionary.items()}
    for val in value_list:
        if val in transposed_dict.keys():
            keys.append(transposed_dict[val])
    return keys

def write_to_file(flag_counter, outfile):
    fp = open(outfile, 'w')
    fp.write("Flag,Value\n")
    for key, value in flag_counter.items():
        fp.write(str(key) + "," + str(value) + '\n')
    fp.close()

def get_pango_recombs(filename):
    """
    Construct a Dictionary of Pango-designated recombinants name to UShER tree node-ids mapping.

    Parameters
    ----------
    filename: str
        The input data file (CSV) containing UShER tree information on Pango-designated recombinants

    Returns
    ----------
    Dict
        The Dictionary mapping Pango recombinant name to its UShER node id.
    """
    # HEADER: PangoRecombinant,NodeID,Date,EarliestSampleDate,EarliestSample
    NAME = "PangoRecombinant"
    ID = "NodeID"
    df = pl.read_csv(filename).select(NAME, ID)
    return dict(df.iter_rows())

def get_included_pango_recombs(RECOMB_DATA_FILE, pango_recombs_data):
    """
    For each Pango-designated recombinant node identified exactly (exact node match) by RIVET,
    record the distribution of various filtration flags applied by RIVET.

    Parameters
    ----------
    RECOMB_DATA_FILE: str
        The input data file (TSV) containing RIVET results.
    pango_recombs_data: Dict
        The Dictionary mapping Pango recombinant name to its UShER node id.

    Returns
    ----------
    Dict
        The Dictionary recording the frequency of each filtration flag for matching Pango recombinants.
    """
    PASS = "PASS"
    # Ignore 'Alt' flag
    flag_counter = {
        "PASS": 0,
        "Suspicious_mutation_clump": 0,
        "Too_many_mutations_near_INDELs": 0,
        "Informative_sites_clump": 0,
    }
    df = pl.read_csv(RECOMB_DATA_FILE, separator='\t')

    pango_not_found = 0
    matching = []
    pango_recombs = np.array(list(pango_recombs_data.values()))
    for pr in pango_recombs:
        flags = filtration_flag(pr, df)
        if flags:
            if PASS in flags:
                flag_counter[PASS] += 1
                matching.append(pr)
                continue
            unique_flags = set()
            for flag in flags:
                # Ignore alternates or redunant flags
                if flag == "ALT" or flag == "Alt" or flag == "redundant":
                    continue
                unique_flags.add(flag)
            for flag in unique_flags:
                if flag not in flag_counter.keys():
                    print("Flag not accounted for: ", flag)
                    exit()
                flag_counter[flag]+= 1
            matching.append(pr)
        else:
            pango_not_found+=1

    # Sort flag counter by descending frequency
    flag_counter = dict(sorted(flag_counter.items(), key=lambda item: item[1], reverse=True))

    pango_recombs = get_key_by_value(pango_recombs_data, matching)
    assert(len(pango_recombs) == len(matching))

    return flag_counter


if __name__ == "__main__":
    pango_recombs_data = get_pango_recombs(PANGO_RECOMB_LINEAGES_FILE)
    flag_counter = get_included_pango_recombs(RECOMB_DATA_FILE, pango_recombs_data)
    write_to_file(flag_counter, OUTFILE)
    print("Results successfully written to file: ", OUTFILE)
