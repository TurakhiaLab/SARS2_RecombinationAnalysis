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

### Run Chronumental
```
./scripts/run_chronumental.sh $MAT $METADATA
```


# Notebooks

Launch Jupyter notebooks, and open the `Recombination-Analysis` in `notebooks` directory.
```
jupyter notebook
```
