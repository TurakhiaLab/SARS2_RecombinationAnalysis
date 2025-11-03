"""
TODO:
"""

from Bio import SeqIO
from Bio.SeqRecord import SeqRecord
from Bio.Seq import Seq
from util import Config
import os
import polars as pl
import subprocess
import shutil


def subprocess_runner(command):
    """
    Run the given string command as a subprocess.

    Parameters
    ----------
    command: List[str]
        The full command to run, including args.

    Returns
    ----------
    Dict
        The result of running the command as a subprocess.
    """
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        if result.stderr:
            print("result.stderr: ", result.stderr)
            exit(1)
        return result

    except Exception as e:
        print(f"Error occurred: {e}")
        exit(1)


def get_trio_nodes(recomb_file):
    """
    TODO:
    """
    df = pl.read_csv(recomb_file)
    recomb_ids = df["Node"].unique()
    donor_ids = df["DonorID"].unique()
    acceptor_ids = df["AcceptorID"].unique()
    all_node_ids = pl.concat([recomb_ids, donor_ids, acceptor_ids])
    return all_node_ids.unique().to_list()


def write_node_ids(outfile, node_ids):
    """
    TODO:
    """
    fp_out = open(outfile, "w")
    for _id in node_ids:
        fp_out.write(_id + "\n")
    fp_out.close()


def matUtils_extract_vcf(mat_path, node_ids_path, output_vcf_path):
    """
    Run a matUtils extract command to extract the a VCF file for the given samples.

    Parameters
    ----------
    mat_path: str
        The path to the MAT (.pb) file.

    node_ids_path: str
        The path to the node ids file.

    output_vcf_path: str
        The path to the output VCF file to write.

    Example:
        matUtils extract -i <tree.pb> -s <node_ids.txt> -v <node_ids.vcf>
    """
    cmd = [
        "matUtils",
        "extract",
        "-i",
        "{}".format(mat_path),
        "-s",
        "{}".format(node_ids_path),
        "-v",
        "{}".format(output_vcf_path),
    ]
    print("Running matUtils command: ", cmd)
    result = subprocess_runner(cmd)


def vcf2fasta(reference_filepath, vcf_filepath, fasta_output_dir):
    """
    TODO:

    vcf2fasta -f NC_045512v2.fa samples.vcf
    """
    CURRENT_DIR = os.getcwd()
    reference_file = os.path.basename(reference_filepath)
    # Increase the allowed number of open file descriptors, required for vcf2fasta
    subprocess_runner(["ulimit", "-n", "10000"])

    # Switch to fasta output dir to write all the fasta files
    os.chdir(fasta_output_dir)

    cmd = ["vcf2fasta", "-f", "{}".format(reference_file), "{}".format(vcf_filepath)]
    # Convert all the trios to fasta files, from VCF
    result = subprocess_runner(cmd)
    os.chdir(CURRENT_DIR)


def load_single_fasta_sequence(fasta_file):
    """
    This function assumes only a single sequence (record) per input FASTA file.
    TODO:
    """
    f = open(fasta_file, "r")
    # Get the record name, including newline
    name = f.readlines()[0]
    f.seek(0)
    seq = "".join(line.strip() for line in f if not line.startswith(">"))
    try:
        assert len(seq) == 29903
    except:
        print("Length of sequence: ", len(seq))
        print("Filename: ", fasta_file)
        exit(1)
    return name, seq.upper()


def extract_spike(seq):
    """
    TODO
    """
    START = 21563 - 1  # -1 since seq is 0-indexed
    END = 25384
    return seq[START:END]


def write_fasta(name, seq, fp_out):
    """
    TODO:
    """
    fp_out.write(name + seq + "\n")


def write_spike_sequences(fastas_dir, spike_translated_outfile):
    """
    TODO:
    """
    from os import listdir
    from os.path import isfile, join

    exclude_files = ["NC_045512v2.fa.fai", "NC_045512v2.fa"]
    fastas = [
        f
        for f in listdir(fastas_dir)
        if (isfile(join(fastas_dir, f)) and f not in exclude_files)
    ]
    f_out = open(spike_translated_outfile, "w")
    count = 0
    for file in fastas:
        name, seq = load_single_fasta_sequence(os.path.join(fastas_dir, file))
        spike_seq_nt = extract_spike(seq)
        nt_seq = Seq(spike_seq_nt)
        protein_seq = str(nt_seq.translate())
        write_fasta(name, protein_seq, f_out)
        count += 1
    f_out.close()


def main():
    CONFIG = "config.yaml"
    config = Config(CONFIG)
    data_dir = "data"

    # Ensure data directory is found
    if not os.path.isdir(data_dir):
        raise FileNotFoundError(f"Data Directory not found: '{data_dir}'")

    FA_DIR = "covfit_fastas"
    FA_DIR_PATH = os.path.join(data_dir, FA_DIR)
    node_ids_outfile = os.path.join(data_dir, "node_ids.txt")
    output_vcf = os.path.join(data_dir, "node_ids.vcf")
    translated_fasta_file = os.path.join(data_dir, "all_spike_translated.fasta")
    # Get all the recombinant trio node ids from rivet results file
    node_ids = get_trio_nodes(os.path.join(data_dir, config.RECOMBINATION_STATS_FILE))

    # Write each id to a txt file, one per line, for input to matUtils
    write_node_ids(node_ids_outfile, node_ids)
    matUtils_extract_vcf(config.MAT, node_ids_outfile, output_vcf)

    # Convert VCF trios file to a separate fasta file for each internal node
    reference_file = "data/NC_045512v2.fa"
    if not os.path.exists(FA_DIR_PATH):
        os.mkdir(FA_DIR_PATH)

    vcf2fasta(reference_file, os.path.abspath(output_vcf), FA_DIR_PATH)

    # Extract the spike protein region from each FASTA file, as input to covfit model
    write_spike_sequences(FA_DIR_PATH, translated_fasta_file)


if __name__ == "__main__":
    main()
