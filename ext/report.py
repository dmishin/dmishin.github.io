# --------------------------------------------------------------------------
# This extension prints a simple status report at the end of each build.
#
# Author: Darren Mulholland <darren@mulholland.xyz>
# License: Public Domain
# --------------------------------------------------------------------------

from ark import hooks, site


# Register a callback on the 'exit' event hook.
@hooks.register('exit')
def print_status_report():
    num_rendered, num_written = site.rendered(), site.written()

    # We only want to print a report after a build run.
    if num_rendered == 0:
        return

    txt_rendered = "1 page" if num_rendered == 1 else "%s pages" % num_rendered
    txt_written = "1 page" if num_written == 1 else "%s pages" % num_written

    time = site.runtime()
    average = time / num_rendered

    status = "%s rendered, %s written in %.2f seconds. %.4f seconds per page."
    print(status % (txt_rendered, txt_written, time, average))
