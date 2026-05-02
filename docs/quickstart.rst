.. _quickstart:

Quick Start
===========

This guide walks you through a basic wellpath analysis workflow in under
five minutes.

1. Import the Library
---------------------

.. code-block:: python

   import wellpath_analyst as wpa

2. Load Survey Data
-------------------

Load a survey from a CSV file containing columns for measured depth (MD),
inclination (Inc), and azimuth (Azi)::

   survey = wpa.load_survey("well_survey.csv", depth_unit="ft", angle_unit="deg")

Or create a survey from raw data programmatically::

   import pandas as pd

   df = pd.DataFrame({
       "MD":   [0.0, 500.0, 1000.0, 1500.0, 2000.0, 2500.0],
       "Inc":  [0.0, 2.0,   15.0,    30.0,    45.0,    45.0],
       "Azi":  [0.0, 90.0,  90.0,    90.0,    90.0,    90.0],
   })

   survey = wpa.Survey(df, depth_unit="ft", angle_unit="deg")

3. Calculate the Trajectory
----------------------------

Compute the well path coordinates using the Minimum Curvature method::

   trajectory = survey.calculate(method="min_curvature")

   # View the resulting trajectory DataFrame
   print(trajectory.to_dataframe().head())

The output includes columns: ``MD``, ``Inc``, ``Azi``, ``TVD``,
``Northing``, ``Easting``, ``DLS``, and ``SectionLength``.

4. Visualize the Well Path
---------------------------

Create a 3D plot of the trajectory::

   trajectory.plot3d(title="Well Alpha — Planned Path")

To use the interactive Plotly backend::

   trajectory.plot3d(backend="plotly", title="Well Alpha — Planned Path")

5. Anti-Collision Check
------------------------

Load a second well and check the separation factor::

   offset_survey = wpa.load_survey("offset_well.csv")
   offset_trajectory = offset_survey.calculate(method="min_curvature")

   result = wpa.anticollision.separation_factor(trajectory, offset_trajectory)
   print(f"Minimum Separation Factor: {result.min_sf:.2f}")
   print(f"Closest approach at MD: {result.closest_md:.1f} ft")

6. Export the Results
----------------------

Export the calculated trajectory to CSV::

   trajectory.to_csv("well_alpha_trajectory.csv")

Or to Excel::

   trajectory.to_excel("well_alpha_trajectory.xlsx")

Next Steps
----------

-  :ref:`survey_data` — Detailed survey data formats and options
-  :ref:`trajectory_methods` — Supported calculation methods
-  :ref:`visualization` — Advanced plotting and visualization
-  :ref:`anticollision` — Anti-collision analysis in depth
