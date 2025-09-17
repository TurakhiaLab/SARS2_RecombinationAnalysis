#!/bin/bash -x
#
# Script to run Chronumental.

MAT="$1"
METADATA="$2"
TREE="$MAT.nwk"

# Extract a newick tree from the UShER MAT
matUtils extract -i "$MAT" -t "$TREE"
# Run chronumental
chronumental --tree "$TREE" --dates "data/$METADATA" --reference_node "CHN/Wuhan_IME-WH01/2019|MT291826.1|2019-12-30" --steps 2000 --only_use_full_dates --use_gpu
