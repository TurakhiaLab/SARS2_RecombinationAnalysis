# recomb-experiments

## Setup

Conda Env
```
conda env create -f install/env.yml
conda activate recomb-experiments
```

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


# Notebooks

Launch Jupyter notebooks, and open the `Recombination-Analysis` in `notebooks` directory.
```
jupyter notebook
```
