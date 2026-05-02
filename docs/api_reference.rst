.. _api_reference:

API Reference
=============

This section documents the public API of Wellpath Analyst.

Survey Module
-------------

.. module:: wellpath_analyst.survey

.. class:: Survey(data, depth_unit="ft", angle_unit="deg", reference_point=(0, 0, 0), magnetic_declination=0.0)

   Container for directional survey data.

   :param data: Survey data as a pandas DataFrame with MD, Inc, Azi columns.
   :type data: pandas.DataFrame
   :param str depth_unit: Depth unit (``"ft"`` or ``"m"``).
   :param str angle_unit: Angle unit (``"deg"`` or ``"rad"``).
   :param tuple reference_point: Surface reference ``(Northing, Easting, TVD)``.
   :param float magnetic_declination: Magnetic declination in degrees.

   .. method:: calculate(method="min_curvature")

      Compute well trajectory from survey data.

      :param str method: One of ``"min_curvature"``, ``"radius_curvature"``,
         ``"balanced_tangential"``, ``"average_angle"``.
      :returns: Computed trajectory.
      :rtype: Trajectory

   .. method:: convert_depth(target_unit)

      Convert depth units.

      :param str target_unit: ``"ft"`` or ``"m"``.
      :returns: New Survey with converted depths.
      :rtype: Survey

   .. method:: convert_angles(target_unit)

      Convert angle units.

      :param str target_unit: ``"deg"`` or ``"rad"``.
      :returns: New Survey with converted angles.
      :rtype: Survey

   .. method:: add_station(md, inc, azi)

      Append a survey station.

   .. method:: remove_station(index)

      Remove a station by index.

   .. method:: to_csv(path)

      Export survey data to CSV.

   .. method:: to_excel(path, sheet_name="Survey")

      Export survey data to Excel.

.. function:: load_survey(filepath, md_col=None, inc_col=None, azi_col=None, depth_unit="ft", angle_unit="deg", sheet_name=None)

   Load survey data from file.

   :param str filepath: Path to the survey file.
   :returns: Loaded survey.
   :rtype: Survey

Trajectory Module
-----------------

.. module:: wellpath_analyst.trajectory

.. class:: Trajectory(positions, method, depth_unit, ref_point)

   Computed well trajectory with position data.

   .. method:: to_dataframe()

      Return trajectory as a pandas DataFrame.

      :rtype: pandas.DataFrame

   .. method:: interpolate(md)

      Interpolate well path position at a given measured depth.

      :param float md: Target measured depth.
      :returns: Interpolated position ``(TVD, Northing, Easting)``.
      :rtype: tuple

   .. method:: plot3d(title="Well Trajectory", backend="matplotlib", **kwargs)

      3D visualization of the trajectory.

   .. method:: plot_plan(title="Plan View", **kwargs)

      2D plan view (Northing vs. Easting).

   .. method:: plot_section(azimuth=0.0, title="Vertical Section", **kwargs)

      2D vertical section view.

   .. method:: plot_tvd_vs_md(title="TVD vs MD", **kwargs)

      TVD vs. Measured Depth plot.

   .. method:: to_csv(path)

      Export to CSV.

   .. method:: to_excel(path, sheet_name="Trajectory")

      Export to Excel.

Anti-Collision Module
---------------------

.. module:: wellpath_analyst.anticollision

.. function:: separation_factor(reference, offset, uncertainty_model="iscwsa", scan_step=None)

   Compute separation factor between two wells.

   :param Trajectory reference: Reference well trajectory.
   :param Trajectory offset: Offset well trajectory.
   :param uncertainty_model: ``"iscwsa"``, ``"constant"``, or an
      :class:`ISCWSAErrorModel` instance.
   :param float scan_step: MD increment for scanning. Defaults to config value.
   :returns: Anti-collision results.
   :rtype: AntiCollisionResult

.. function:: multi_well_sf(reference, offsets, labels=None, **kwargs)

   Compute separation factors between one reference and multiple offsets.

   :param Trajectory reference: Reference well.
   :param list offsets: List of offset :class:`Trajectory` objects.
   :param list labels: Labels for each offset well.
   :returns: Dictionary mapping labels to :class:`AntiCollisionResult`.
   :rtype: dict

.. class:: AntiCollisionResult

   Results of an anti-collision scan.

   .. attribute:: min_sf

      Minimum separation factor found. (float)

   .. attribute:: min_distance

      Minimum center-to-center distance. (float)

   .. attribute:: closest_md_ref

      MD on reference well at closest approach. (float)

   .. attribute:: closest_md_off

      MD on offset well at closest approach. (float)

   .. method:: to_dataframe()

      Full results as a DataFrame.

   .. method:: close_approach_report(sf_threshold=2.0)

      Filter results below the given SF threshold.

   .. method:: traveling_cylinder_plot(title="Traveling Cylinder", sf_cutoff=2.0, backend="matplotlib")

      Generate a traveling cylinder plot.

Torque & Drag Module
--------------------

.. module:: wellpath_analyst.torque_drag

.. class:: TorqueDragModel(trajectory, pipe_od, pipe_id, pipe_weight, mud_weight, c_factor=0.25, bha_weight=0.0, bha_length=0.0, wob=0.0)

   Soft-string torque and drag model.

   .. method:: hook_load(operation="trip_out")

      Compute hook load for the specified operation.

      :param str operation: ``"trip_out"``, ``"trip_in"``, or ``"rotating"``.
      :returns: Surface hook load (lbf).
      :rtype: float

   .. method:: surface_torque(operation="rotating")

      Compute surface torque.

      :returns: Surface torque (ft-lbf).
      :rtype: float

   .. method:: side_force_profile()

      Compute side force at each station.

      :rtype: SideForceProfile

   .. method:: plot_hook_load(operations=None, title="Hook Load", **kwargs)

      Plot hook load vs. depth for specified operations.

   .. method:: plot_side_force(title="Side Force Profile", **kwargs)

      Plot side force vs. depth.

Utility Functions
-----------------

.. module:: wellpath_analyst.utils

.. function:: dogleg(inc1, azi1, inc2, azi2)

   Compute the dogleg angle between two stations.

   :param float inc1: Inclination at station 1 (radians).
   :param float azi1: Azimuth at station 1 (radians).
   :param float inc2: Inclination at station 2 (radians).
   :param float azi2: Azimuth at station 2 (radians).
   :returns: Dogleg angle in radians.
   :rtype: float

.. function:: dls(dogleg_angle, delta_md, unit="per100ft")

   Compute dogleg severity.

   :param float dogleg_angle: Dogleg angle (radians).
   :param float delta_md: Course length.
   :param str unit: ``"per100ft"`` or ``"per30m"``.
   :returns: DLS in degrees per reference length.
   :rtype: float
