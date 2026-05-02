.. _survey_data:

Survey Data
===========

Supported Formats
-----------------

Wellpath Analyst can import survey data from the following formats:

+-----------------+---------------------------+----------------------------+
| Format          | Extension                 | Function                   |
+=================+===========================+============================+
| CSV             | ``.csv``                  | :func:`load_survey`        |
+-----------------+---------------------------+----------------------------+
| Excel           | ``.xlsx``, ``.xls``       | :func:`load_survey`        |
+-----------------+---------------------------+----------------------------+
| LAS             | ``.las``                  | :func:`load_survey`        |
+-----------------+---------------------------+----------------------------+
| WITSML          | XML (via ``witsml`` ext)  | :func:`load_witsml`        |
+-----------------+---------------------------+----------------------------+

Required Columns
~~~~~~~~~~~~~~~~

Every survey must contain at minimum:

-  **MD** — Measured Depth along the wellbore from the surface reference.
-  **Inc** — Inclination angle (0° = vertical, 90° = horizontal).
-  **Azi** — Azimuth angle (0° = North, 90° = East, etc.).

Optional columns:

-  **TVD** — True Vertical Depth (if pre-calculated; otherwise computed).
-  **Northing** / **Easting** — Surface-referenced coordinates.
-  **DLS** — Dogleg Severity (°/100ft or °/30m).
-  **ToolFace** — Toolface angle at each station.

CSV Import
----------

The simplest way to load a survey::

   survey = wpa.load_survey("survey.csv")

Wellpath Analyst auto-detects common column naming conventions:

-  MD: ``MD``, ``md``, ``measured_depth``, ``Depth``
-  Inc: ``Inc``, ``inc``, ``inclination``, ``Incl``
-  Azi: ``Azi``, ``azi``, ``azimuth``, ``Azimuth``

If your CSV uses non-standard column names, specify them explicitly::

   survey = wpa.load_survey(
       "survey.csv",
       md_col="DEPTH",
       inc_col="INCL",
       azi_col="AZIM"
   )

Excel Import
------------

Load from an Excel file with optional sheet name::

   survey = wpa.load_survey("surveys.xlsx", sheet_name="Well_Alpha")

If the workbook contains multiple sheets and no sheet is specified,
the first sheet is used by default.

LAS Import
----------

LAS (Log ASCII Standard) files are common in petrophysical workflows.
Wellpath Analyst extracts directional survey channels from LAS 2.0 and
3.0 files::

   survey = wpa.load_survey("directional.las")

Unit Handling
-------------

Wellpath Analyst tracks units internally and converts as needed. Specify
units at load time::

   survey = wpa.load_survey("survey.csv", depth_unit="m", angle_unit="rad")

Supported depth units: ``ft``, ``m``
Supported angle units: ``deg``, ``rad``

You can convert units after loading::

   survey_ft = survey.convert_depth("ft")
   survey_deg = survey.convert_angles("deg")

The Survey Object
-----------------

The :class:`Survey` object is the central data container.

.. code-block:: python

   survey = wpa.Survey(
       data=df,
       depth_unit="ft",
       angle_unit="deg",
       reference_point=(0.0, 0.0, 0.0),   # (northing, easting, tvd) surface location
       magnetic_declination=5.3,           # degrees East
   )

Key attributes:

=============== =========================================================
Attribute       Description
=============== =========================================================
``data``        ``pandas.DataFrame`` with MD, Inc, Azi (and optional columns)
``depth_unit``  Current depth unit (``"ft"`` or ``"m"``)
``angle_unit``  Current angle unit (``"deg"`` or ``"rad"``)
``ref_point``   Surface reference coordinates ``(N, E, TVD)``
``mag_dec``     Magnetic declination applied to azimuths
=============== =========================================================

Key methods:

============================= ==========================================
Method                        Description
============================= ==========================================
``calculate(method)``         Compute trajectory; returns :class:`Trajectory`
``convert_depth(unit)``       Return a new Survey with converted depth units
``convert_angles(unit)``     Return a new Survey with converted angle units
``add_station(md, inc, azi)`` Append a survey station
``remove_station(index)``     Remove a survey station by index
``to_csv(path)``              Export survey data to CSV
``to_excel(path)``            Export survey data to Excel
============================= ==========================================
