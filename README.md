# SARS-CoV-2 Recombination Analysis

## Table of Contents
- [Setup](#setup)
- [Preparing Data for SARS-CoV-2 Recombination Analysis](#recomb_data)
    - [Fetching UShER Mutation-Annotated Tree](#mat)
    - [Post-Processing RIVET Outputs](#rivet_results)
    - [Running RIVET to infer recombination](#rivet)
    - [Generating Data Files](#data_gen)
- [Notebook for Recombination Analysis](#notebook)
    - [Supplemental Analysis](#supp_analysis)
- [References](#references)


# <a name="setup"></a> Setup

This repository uses the `pixi` package manager. Install `pixi` if not already installed on your system with the following command.
If you already have `pixi` installed on your system, please skip to the step below to activate the `pixi` shell environment.

NOTE: This command will work for Linux & macOS installation only, please see the `pixi` installation page for Windows: [install pixi](https://pixi.sh/latest/installation/).


```
curl -fsSL https://pixi.sh/install.sh | sh
```

To clone this repository, type the following command: (This will take a couple of minutes)
```
git clone --recurse-submodules https://github.com/TurakhiaLab/SARS2_RecombinationAnalysis.git
cd SARS2_RecombinationAnalysis
```


# <a name="recomb_data"></a>Preparing Data for SARS-CoV-2 Recombination Analysis
The recombination analysis requires the following files, available in the `data` directory. You can either use these files directly and proceed to the [notebook](#notebook), or generate your own by following the steps below.

- `substitutions_scores.csv`: A file containing the PyR0 fitness scores for all ranked substitutions considered by PyR0 found in the "2023-12-25" private MAT.
- `monthly_fitness_stats.csv`: A file containing some basic statistics for the circulating fitness of all SARS-CoV-2 samples found in the MAT for each month. 
- `rivet_recombs_data.csv`: The file containing all the information and statistics for the detected recombinants included in this analysis.

- `genetic-diversity-gisaidAndPublic.2023-12-25.csv`: The computed standing genetic diversity scores for the "2023-12-25" private MAT.
- `reference.fasta`: The SARS-CoV-2 reference genome.

The following two files will be automatically downloaded or generated and placed into the `data` directory when the `pixi run data` command is run:
- `time_series_covid19_confirmed_global.csv`: The JHU SARS-CoV-2 global daily cumulative confirmed case count data.
- `mutations.tsv`: Contains the individual amino acid mutation fitness scores from the PyR0 model, ranked by statistical significance.
- `chronumental_dates_gisaidAndPublic.2023-12-25-STEPS2000-SERIAL3.metadata.tsv.tsv`: The Chronumental-inferred emergence dates for all samples in the MAT.

### <a name="mat"></a>Fetching UShER Mutation-Annotated Tree

A private MAT (dated "2023-12-25") containing GISAID sequences with privileged access was used for the analysis in this manuscript. Please feel free to email us if you need access to this MAT and its metadata file. The full analysis is also completely compatible with the publicly available MATs that can be downloaded from: [https://hgdownload.soe.ucsc.edu/goldenPath/wuhCor1/UShER_SARS-CoV-2/](https://hgdownload.soe.ucsc.edu/goldenPath/wuhCor1/UShER_SARS-CoV-2). 
To reproduce this analysis with any MAT, replace relevant fields (shown below) in the `config.yaml` file with the correct name and date of the MAT and metadata files used. Make sure these files are copied into the `data` directory.

```
# Date of the MAT used for analysis
MAT_DATE: "2023-12-25"
# Name of the MAT and metadata file used in this analysis
MAT: gisaidAndPublic.2023-12-25.masked.nextclade.pangolin.pb
METADATA: gisaidAndPublic.2023-12-25.metadata.tsv
```

### <a name="rivet_results"></a>Post-Processing RIVET Outputs

If you have already run `RIVET` separately, copy the following two `RIVET` output files into the `data` directory. Otherwise, first run `RIVET` separately, and then copy these two output files into the `data` directory before proceeding to the next steps. For instructions on running `RIVET`, please see the section below titled: [Running RIVET to infer recombination](#rivet).

- `final_recombinants_2023-12-25.txt`: The `RIVET` inferred recombination results from the "2023-12-25" private MAT.
- `trios_2023-12-25.vcf`: The VCF file for all trio recombinant sequences inferred by `RIVET`.

```
cp final_recombinants_2023-12-25.txt data/
cp trios_2023-12-25.vcf data/
```

### <a name="rivet"></a> Running RIVET to infer recombination

Please see the instructions for installing `RIVET` on your machine: [Use RIVET Locally](https://turakhia.ucsd.edu/rivet/#use-rivet-locally)

Once `RIVET` is installed, please see the instructions for running the `RIVET` "backend" pipeline and the required inputs to infer recombination: [RIVET Backend Input](https://turakhia.ucsd.edu/rivet/#rivet-backend-input)

Two of the `RIVET` output files, `final_recombinants_<DATE>.txt` and `trios.vcf` were used in this analysis (`RIVET_RESULTS_FILE` and `RIVET_VCF_FILE` fields in `config.yaml`).


### <a name="data_gen"></a>Generating Data Files
Follow these steps to generate all the data files used in the recombination analysis notebook, primarily `rivet_recombs_data.csv`.

Chronumental will be automatically re-run, since the inferred emergence dates of recombinants are required for this analysis. See the `config.yaml` field below.
```
RERUN_CHRONUMENTAL: True
```

Run the following command to generate the data used in this analysis:
```
pixi run data
```

If you are using a different MAT than the one used in this analysis or wish to re-generate these results (already included in the `data` directory for the MAT used in this analysis), follow the instructions at the link provided below to reproduce the entire standing genetic diversity file (`genetic-diversity-gisaidAndPublic.2023-12-25.csv`) for all months.

- Instructions: [Calculate Standing Genetic Diversity](docs/diversity.md)

<br>

If you want to reproduce the monthly circulating fitness statistics (`monthly_fitness_stats.csv`), you can run the pixi task command below, after running the above `pixi run data` command to generate the Chronumental file. This command requires the Chronumental dates output file to be in the `data` directory.

```
pixi run circulating-fitness-stats
```


# <a name="notebook"></a>Notebooks for Recombination Analysis
The Jupyter notebook `notebooks/analysis.ipynb` reproduces the analyses and statistics reported in the manuscript using the following files from the `data` directory:
- `rivet_recombs_data.csv`
- `substitutions_scores.csv`
- `monthly_fitness_stats.csv`

Run the following two commands to launch the `notebooks/analysis.ipynb` notebook.

```
# First, activate the shell environment that contains all the necessary dependencies
pixi shell
# Then launch the notebook
pixi run jupyter lab notebooks/analysis.ipynb
```

## <a name="supp_analysis"></a>Supplemental Analysis

For more documentation on reproducing the supplemental analysis and figures, please see this section: [Supplemental Analysis](docs/supplemental.md)


# <a name="references"></a>References
This work was only made possible by the important contributions of the following methods and datasets. In addition to this manuscript, please consider citing the following papers if you found this analysis useful for your research.

- PyR0 Model
    - Obermeyer, F. et al. Analysis of 6.4 million SARS-CoV-2 genomes identifies mutations associated with fitness. Science 376, 1327–1332 (2022).

- JHU CSSE COVID-19 Dataset
    - Dong, E., Du, H. & Gardner, L. An interactive web-based dashboard to track COVID-19 in real time. Lancet Infect. Dis. 20, 533–534 (2020).
 
- Chronumental
    - Sanderson, T. Chronumental: time tree estimation from very large phylogenies. 2021.10.27.465994 Preprint at https://doi.org/10.1101/2021.10.27.465994 (2021).

