"""
Helper class to perform the recombinant breakpoint analysis in 'analysis.ipynb' notebook for Figure S8.
"""

import os
import time
import heapq
import seaborn as sns
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.collections import LineCollection
from util import get_recombinant_data


def calculate_midpoint(bp_lower_bound, bp_upper_bound):
    return (bp_lower_bound + bp_upper_bound) // 2


class BreakpointAnalysis:
    informative_sites_filename = "informative_sites.tsv"

    def __init__(self, config):
        self.config = config
        print("Loading all data for simulation analysis")
        start_time = time.perf_counter()
        self.data_dir = config.DATA_DIR
        self.rivet_results_file = config.RIVET_RESULTS_FILE
        self.recomb_results_file = config.RECOMBINATION_STATS_FILE
        self.recomb_data = get_recombinant_data(self.recomb_results_file)
        self.region_dict = self._build_region_dict(config.GENBANK_FILE)

        end_time = time.perf_counter()
        elapsed_time = end_time - start_time
        print(
            f"Data loaded, breakpoint analysis ready. Elapsed time: {elapsed_time:.4f} seconds"
        )

    def _build_region_dict(self, genbank_filepath):
        """Extract gene coordinates from GenBank file in data directory."""
        from Bio import SeqIO

        color_map = {
            "ORF1ab": "#add8e6",
            "S": "#ffffe0",
            "ORF3a": "#ffdc9d",
            "E": "#bcf5bc",
            "M": "#ffceff",
            "ORF6": "#e6e6fa",
            "ORF7a": "#ffe4b5",
            "ORF7b": "#f08080",
            "ORF8": "#20b2aa",
            "N": "#ffa500",
            "ORF10": "#cccccc",
        }
        region_dict = {}
        record = SeqIO.read(genbank_filepath, "genbank")

        for feature in record.features:
            if feature.type == "gene":
                gene_name = feature.qualifiers.get("gene", ["Unknown"])[0]

                # +1 since coordinates are 0-indexed
                start = int(feature.location.start) + 1
                end = int(feature.location.end)

                # Assign color from colormap to gene, otherwise default grey
                color = color_map.get(gene_name, "#cccccc")

                region_dict[gene_name] = {"xpos": start, "end": end, "color": color}

        return region_dict

    def get_regions(self):
        return self.region_dict

    def load_bp_intervals(self, genome_size=29903):
        def format_bp_interval(bp_interval):
            bp_interval = bp_interval.strip().strip("()")
            return tuple(map(int, bp_interval.split(",")))

        def record_breakpoint_interval(splitline, intervals, genome_size):
            bp1_col_idx = 6
            bp2_col_idx = 7
            interval1 = format_bp_interval(splitline[bp1_col_idx])
            if interval1[1] < genome_size:
                intervals.append(interval1)
            interval2 = format_bp_interval(splitline[bp2_col_idx])
            if interval2[1] < genome_size:
                intervals.append(interval2)

        intervals = []
        recorded_recombs = set()
        fp = open(self.rivet_results_file)
        # Skip header
        next(fp)
        for line in fp:
            splitline = line.strip().split("\t")
            recomb_id = splitline[0]
            qc_flag = splitline[23]

            recomb_id_exists = (
                self.recomb_data["Node"].str.contains(recomb_id, literal=True).any()
            )
            if not recomb_id_exists:
                continue

            if recomb_id not in recorded_recombs:
                if qc_flag == "PASS" or qc_flag == "Too_many_mutations_near_INDELs,":
                    record_breakpoint_interval(splitline, intervals, genome_size)
                    recorded_recombs.add(recomb_id)
        return sorted(intervals), recorded_recombs

    def place_intervals(self, intervals):
        """"""
        track_heap = []
        segments_to_plot = []
        empty_tracks = []
        max_track_cnt = 0

        for interval in intervals:
            cur_track_cnt = None
            if (len(track_heap) == 0 or track_heap[0][0] > interval[0]) and (
                len(empty_tracks) == 0
            ):
                cur_track_cnt = len(track_heap)
            else:
                while len(track_heap) > 0 and track_heap[0][0] <= interval[0]:
                    heapq.heappush(empty_tracks, heapq.heappop(track_heap)[1])
                cur_track_cnt = heapq.heappop(empty_tracks)

            heapq.heappush(track_heap, (interval[1], cur_track_cnt))
            max_track_cnt = max(max_track_cnt, len(track_heap))
            segments_to_plot.append(
                [(interval[0], cur_track_cnt), (interval[1], cur_track_cnt)]
            )
        return (max_track_cnt, segments_to_plot)
