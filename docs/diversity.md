# Standing Genetic Diversity Calculation

We use the phylogenetic entropy index as a metric to capture the circulating genetic diversity available to recombining sequences that emerge during a given month of the pandemic.

Included with the `RIVET` backend, is a "`diversity`" program, that extracts a subtree from the MAT, containing all the samples for the given month, and computes the diversity metric over that subtree.


1. The first step is to install the `RIVET` backend. We recommend following the steps here: [Installing RIVET Backend using Docker on Linux](https://turakhia.ucsd.edu/rivet/#installing-rivet-backend-using-docker-on-linux)

2. Once you have installed `RIVET` through the `Docker` environment, check to see that your environment is properly installed by typing the `diversity` program help command.

```
diversity --help
```
You should see the following help message:

```
diversity options:
  -i [ --input-mat ] arg        Input mutation-annotated tree file. [REQUIRED]
  -C [ --chronumental ] arg     Chronumental dates file corresponding to the
                                given MAT. [REQUIRED]
  -m [ --month ] arg            Given month to calculate standing genetic
                                diversity for. [REQUIRED]
  -T [ --threads ] arg (=24)    Number of threads to use when possible [DEFAULT
                                uses all available cores, 24 detected on this
                                machine]
  -h [ --help ]                 Print help message
```

3. Run the diversity program, given an input MAT, Chronumental dates file, and the month for which you want to compute the available standing genetic diversity.

Example computing the diversity for the month 2020-05.
```
diversity -i <MAT.pb> -C <CHRON_FILE.tsv> -m "2020-05"
```

You will see the following similar output when running this program:
```
Loading input MAT file: <MAT.pb>
Computing standing genetic diversity for month: 2020-05, with 36382 samples.
Month: 2020-05, Diversity: 63.8522
```

**NOTES:**
- Ensure that the MAT file provided is more recent than the month you wish to compute the diversity for.
- For some months when millions of sequences were deposited to the online databases (eg. 2022-01), the subtree extraction that is performed when computing the standing genetic diversity for that month could take several days to compute.
