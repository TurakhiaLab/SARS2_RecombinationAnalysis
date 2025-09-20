# recomb-experiments

# Run RIVET for recombination inference

### Download a MAT and MAT metadata file

Download MAT data at the following link: [https://hgdownload.soe.ucsc.edu/goldenPath/wuhCor1/UShER_SARS-CoV-2/](https://hgdownload.soe.ucsc.edu/goldenPath/wuhCor1/UShER_SARS-CoV-2/)

```
Eg) For date 2025/09/07/
- MAT: public-2025-09-07.all.masked.pb.gz
- Metadata: public-2025-09-07.metadata.tsv.gz
```

# Install RIVET
Install `rivet` and fill out the `ripples.config` `YAML` file.
```
docker run -it mrkylesmith/ripples_pipeline:latest
python3 rivet-backend.py --help
```
Detailed instructions on installing and running `RIVET` can be found here: [RIVET Docs](https://turakhia.ucsd.edu/rivet/)

Copy the blank `YAML` configuration template into the top level directory.
```
cp template/ripples.yaml .
```

Fill out the relevant `YAML` file with the current run parameters, including the name of the MAT and metadata file.

The following example is shown for the public MAT for `2025-09-07`:
```
# Ripples Parameters Config [REQUIRED]
version: ripples-fast
mat: public-2025-09-07.all.masked.pb.gz
newick: public-2025-09-07.all.masked.nwk
metadata: public-2025-09-07.metadata.tsv
date: 2025-09-07
# Local results output directory
results: results
reference: NC_045512v2.fa
```

Then launch the `rivet` job.
```
python3 rivet-backend.py
```


### Run Chronumental
```
./scripts/run_chronumental.sh $MAT $METADATA
```

# Infection Counts

```
wget https://raw.githubusercontent.com/CSSEGISandData/COVID-19/refs/heads/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv
```


# Standing Genetic Diversity
TODO: Add command to calculate the standing genetic diversity metric.



# Fitness

### Download PyR0 model mutation fitness data
The `mutations.tsv` file contains the individual amino acid mutations fitness scores from the PyR0 model, ranked by statistical significance.

Download this file into the `data` directory.
```
wget https://raw.githubusercontent.com/broadinstitute/pyro-cov/7d2829dc9c209399ecc188f2c87a881bdb09b221/paper/mutations.tsv data/
```


# Analysis Notebook

Install `pixi` if not already installed on your system with the following command:
NOTE: This command will work for Linux & macOS installation only, please see the `pixi` installation page for windows: [install pixi](https://pixi.sh/latest/installation/).
```
curl -fsSL https://pixi.sh/install.sh | sh
```

Then run the following two commands to launch the `notebooks/analysis.ipynb` notebook.
```
pixi shell
pixi run jupyter lab notebooks/analysis.ipyn
```

