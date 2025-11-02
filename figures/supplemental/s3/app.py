"""
Small Flask server for displaying figures in browser.
"""

from flask import Flask, render_template, abort
import sys

ALLOWED_PAGES = ["node_240960.html"]
DEFAULT_PORT = 5000
ERROR_MESSAGE = "Provide one of the pages to view: {}".format(ALLOWED_PAGES)

if len(sys.argv) > 1:
    PAGE = sys.argv[1]
    if PAGE not in ALLOWED_PAGES:
        print(ERROR_MESSAGE)
        abort(404, description=ERROR_MESSAGE)
    PORT = DEFAULT_PORT
else:
    print(ERROR_MESSAGE)
    abort(404, description=ERROR_MESSAGE)


app = Flask(__name__)


@app.route("/")
def index():
    return render_template(PAGE)


if __name__ == "__main__":
    app.run(debug=True, port=PORT)
