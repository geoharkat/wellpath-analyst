.. _installation:

Installation
============

Prerequisites
-------------

-  Python 3.9 or higher
-  pip (latest version recommended)
-  Git (for development installs)

Stable Release
--------------

Install the latest stable release from PyPI::

   pip install wellpath-analyst

This will install Wellpath Analyst and all core dependencies.

Development Install
-------------------

To install from source for development::

   git clone https://github.com/geoharkat/wellpath-analyst.git
   cd wellpath-analyst
   pip install -e ".[dev]"

Optional Dependencies
---------------------

Wellpath Analyst ships with several optional dependency groups:

============= =================================================== ======================
Group         Purpose                                            Install Command
============= =================================================== ======================
``viz``       Plotly-based interactive 3D visualization            ``pip install wellpath-analyst[viz]``
``excel``     Excel (.xlsx) import/export via openpyxl            ``pip install wellpath-analyst[excel]``
``witsml``    WITSML data connectivity                           ``pip install wellpath-analyst[witsml]``
``full``      All optional dependencies                          ``pip install wellpath-analyst[full]``
============= =================================================== ======================

Verifying the Installation
---------------------------

After installation, verify that the package is available::

   python -c "import wellpath_analyst; print(wellpath_analyst.__version__)"

You should see the installed version number printed to the console.

Docker
------

A Docker image is also available for containerized workflows::

   docker pull ghcr.io/geoharkat/wellpath-analyst:latest
   docker run -it ghcr.io/geoharkat/wellpath-analyst:latest python -c "import wellpath_analyst; print(wellpath_analyst.__version__)"
