# Supplemental Methods


The scripts and data files used for the supplemental figures are located at the following paths from the top directory:

- Supplemental Figure S1: `figures/supplemental/s1`
- Supplemental Figure S2: `figures/supplemental/s2`
- Supplemental Figure S3: `figures/supplemental/s3`
- Supplemental Figure S4: `figures/supplemental/s4`



## Evaluation of concordance between PyR0 and CoVFit fitness models (Methods, Supplemental Figure S2)

First run the following command to generate the necessary "all_spike_translated.fasta" input file for the CovFit model, which contains the spike protein sequences for all the recombinant nodes and their parental sequences.
```
pixi run covfit
```


The CoVFit CLI executable version “covfit_cli_20241007” was downloaded from the CoVFit GitHub repository (https://github.com/TheSatoLab/CoVFit).

Run the following command to perform inference:
```
./covfit_cli --input data/all_spike_translated.fasta -outdir output/ --fold 3 --dms --batch 16 --gpu
```

