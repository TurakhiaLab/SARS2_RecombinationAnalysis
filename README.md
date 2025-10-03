# recomb-experiments

# Installation

This repository uses the `pixi` package manager. Install `pixi` if not already installed on your system with the following command.
If you already have `pixi` installed on your system, please skip to the step below to activate the `pixi` shell environment.

NOTE: This command will work for Linux & macOS installation only, please see the `pixi` installation page for Windows: [install pixi](https://pixi.sh/latest/installation/).


```
curl -fsSL https://pixi.sh/install.sh | sh
```

## Clone Repository

To clone this repository, type the following command: (This will take a couple of minutes)
```
git clone --recurse-submodules https://github.com/TurakhiaLab/recomb-experiments.git
cd recomb-experiments
```


# Recombination Analysis Notebook
The Jupyter notebook `notebooks/analysis.ipynb` contains the analysis and statistics reported in the manuscript.

The notebook loads the following three data files, included in the `data` directory:
- `rivet_recombs_data.csv`: The file containing all the information and statistics for the detected recombinants included in this analysis.
- `substitutions_scores.csv`: A file containing the PyR0 fitness scores for all ranked substitutions considered by PyR0 found in the "2023-12-25" private MAT.
- `monthly_fitness_stats.csv`: A file containing some basic statistics for the circulating fitness of all SARS-CoV-2 samples found in the MAT for each month. 

Run the following two commands to launch the `notebooks/analysis.ipynb` notebook.

```
# First, activate the shell environment that contains all the necessary dependencies
pixi shell
# Then launch the notebook
pixi run jupyter lab notebooks/analysis.ipynb
```

# Generating Data for SARS-CoV-2 Recombination Analysis
The following files used in the analysis are provided in the `data` directory:

- `substitutions_scores.csv`: A file containing the PyR0 fitness scores for all ranked substitutions considered by PyR0 found in the "2023-12-25" private MAT.
- `monthly_fitness_stats.csv`: A file containing some basic statistics for the circulating fitness of all SARS-CoV-2 samples found in the MAT for each month. 
- `rivet_recombs_data.csv`: The file containing all the information and statistics for the detected recombinants included in this analysis.

- `genetic-diversity-gisaidAndPublic.2023-12-25.csv`: The computed standing genetic diversity scores for the "2023-12-25" private MAT.
- `reference.fasta`: The SARS-CoV-2 reference genome.

The following two files will be automatically downloaded or generated and placed into the `data` directory when the `pixi run data` command is run:
- `time_series_covid19_confirmed_global.csv`: The JHU SARS-CoV-2 global daily cumulative confirmed case count data.
- `mutations.tsv`: Contains the individual amino acid mutation fitness scores from the PyR0 model, ranked by statistical significance.
- `chronumental_dates_gisaidAndPublic.2023-12-25-STEPS2000-SERIAL3.metadata.tsv.tsv`: The Chronumental-inferred emergence dates for all samples in the MAT.

### UShER Mutation-Annotated Tree

A private MAT (dated "2023-12-25") containing GISAID sequences with privileged access was used for the analysis in this manuscript. Please feel free to email us if you need access to this MAT and its metadata file. The full analysis is also completely compatible with the publicly available MATs that can be downloaded from: [https://hgdownload.soe.ucsc.edu/goldenPath/wuhCor1/UShER_SARS-CoV-2/](https://hgdownload.soe.ucsc.edu/goldenPath/wuhCor1/UShER_SARS-CoV-2/). 
To reproduce this analysis with any MAT, replace relevant fields (shown below) in the `config.yaml` file with the correct name and date of the MAT and metadata files used. Make sure these files are copied into the `data` directory.

```
# Date of the MAT used for analysis
MAT_DATE: "2023-12-25"
# Name of the MAT and metadata file used in this analysis
MAT: gisaidAndPublic.2023-12-25.masked.nextclade.pangolin.pb
METADATA: gisaidAndPublic.2023-12-25.metadata.tsv
```

### RIVET Results Files

If you have already run `RIVET` separately, copy the following two `RIVET` output files into the `data` directory. Otherwise, first run `RIVET` separately, and then copy these two output files into the `data` directory before proceeding to the next steps. For instructions on running `RIVET`, please see the section below titled: [Running RIVET to infer recombination](#Running-RIVET-to-infer-recombination).

- `final_recombinants_2023-12-25.txt`: The `RIVET` inferred recombination results from the "2023-12-25" private MAT.
- `trios_2023-12-25.vcf`: The VCF file for all trio recombinant sequences inferred by `RIVET`.

```
cp final_recombinants_2023-12-25.txt data/
cp trios_2023-12-25.vcf data/
```

# Generating data files
Follow these steps to generate all the data files used in the recombination analysis notebook, primarily `rivet_recombs_data.csv`.

**NOTE:** The standing genetic diversity results could take several days to complete for a MAT with millions of sequences.
To compute the standing genetic diversity metric for just a single month (faster), provide the month in the `RERUN_GENETIC_DIVERSITY` field below, as follows:
```
RERUN_GENETIC_DIVERSITY: "2020-07"
```
Or if you want to reproduce the entire standing genetic diversity file (`genetic-diversity-gisaidAndPublic.2023-12-25.csv`) for all months, toggle the `RERUN_GENETIC_DIVERSITY` field to `True`, as follows:
```
RERUN_GENETIC_DIVERSITY: True
```

Chronumental will automatically be re-run, since the inferred emergence dates of recombinants are required for this analysis. If you are using a different MAT than the one used in this analysis or wish to re-generate these results (already included in the `data` directory for this MAT), toggle the `RERUN_GENETIC_DIVERSITY` and `RERUN_MONTHLY_FITNESS_STATS` fields to `True` below:

```
# Decide which steps to rerun
RERUN_CHRONUMENTAL: True
RERUN_GENETIC_DIVERSITY: False  # Or provide a single month, i.e., "2020-07"
RERUN_MONTHLY_FITNESS_STATS: False
```

Run the following command to generate the data used in this analysis:
```
pixi run data
```

# Running RIVET to infer recombination
TODO: Add instructions for running RIVET separately.


# References
This work was only made possible by the important contributions of the following methods and datasets. In addition to this manuscript, please consider citing the following papers if you found this analysis useful for your research.

- PyR0 Model
    - Obermeyer, F. et al. Analysis of 6.4 million SARS-CoV-2 genomes identifies mutations associated with fitness. Science 376, 1327–1332 (2022).

- JHU CSSE COVID-19 Dataset
    - Dong, E., Du, H. & Gardner, L. An interactive web-based dashboard to track COVID-19 in real time. Lancet Infect. Dis. 20, 533–534 (2020).
 
- Chronumental
    - Sanderson, T. Chronumental: time tree estimation from very large phylogenies. 2021.10.27.465994 Preprint at https://doi.org/10.1101/2021.10.27.465994 (2021).

