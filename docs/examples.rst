.. _examples:

Examples
========

This section provides end-to-end examples for common workflows.

Example 1: Basic Survey Processing
-----------------------------------

.. code-block:: python

   import wellpath_analyst as wpa

   # Load a directional survey
   survey = wpa.load_survey("data/well_001.csv")

   # Calculate trajectory
   traj = survey.calculate(method="min_curvature")

   # Print summary
   print(f"Total MD:   {traj.positions['MD'].max():.1f} ft")
   print(f"Final TVD:  {traj.positions['TVD'].iloc[-1]:.1f} ft")
   print(f"Final Northing: {traj.positions['Northing'].iloc[-1]:.1f} ft")
   print(f"Final Easting:  {traj.positions['Easting'].iloc[-1]:.1f} ft")

   # Plot
   traj.plot3d(title="Well 001 — Minimum Curvature", save_path="well_001_3d.png")

Example 2: Multi-Well Field Plot
---------------------------------

.. code-block:: python

   import wellpath_analyst as wpa

   wells = ["alpha", "beta", "gamma", "delta"]
   trajectories = []

   for well in wells:
       survey = wpa.load_survey(f"data/well_{well}.csv")
       traj = survey.calculate()
       trajectories.append(traj)

   wpa.plot_wells(
       trajectories,
       labels=[w.capitalize() for w in wells],
       title="Development Field — All Wells",
       backend="plotly",
   )

Example 3: Anti-Collision Screening
------------------------------------

.. code-block:: python

   import wellpath_analyst as wpa

   # Load reference and offset wells
   ref = wpa.load_survey("data/planned_well.csv").calculate()
   offsets = [
       wpa.load_survey(f"data/offset_{i}.csv").calculate()
       for i in range(1, 6)
   ]

   # Multi-well separation factor
   results = wpa.anticollision.multi_well_sf(
       reference=ref,
       offsets=offsets,
       labels=[f"Offset {i}" for i in range(1, 6)],
   )

   # Identify wells with SF < 2.0
   for label, result in results.items():
       if result.min_sf < 2.0:
           print(f"⚠ WARNING: {label} — Min SF = {result.min_sf:.3f}")
       else:
           print(f"✓ OK: {label} — Min SF = {result.min_sf:.3f}")

   # Generate traveling cylinder plot
   result_list = list(results.values())[0]
   result_list.traveling_cylinder_plot(
       title="Traveling Cylinder — Planned Well",
       backend="plotly"
   )

Example 4: Torque and Drag Estimate
------------------------------------

.. code-block:: python

   from wellpath_analyst import load_survey
   from wellpath_analyst.torque_drag import TorqueDragModel

   traj = load_survey("data/deep_well.csv").calculate()

   model = TorqueDragModel(
       trajectory=traj,
       pipe_od=5.0,
       pipe_id=4.276,
       pipe_weight=19.5,
       mud_weight=12.0,
       c_factor=0.30,
       bha_weight=50000.0,
       bha_length=500.0,
   )

   print(f"Hook load (trip out):  {model.hook_load('trip_out'):,.0f} lbf")
   print(f"Hook load (trip in):   {model.hook_load('trip_in'):,.0f} lbf")
   print(f"Hook load (rotating):  {model.hook_load('rotating'):,.0f} lbf")
   print(f"Surface torque:        {model.surface_torque('rotating'):,.0f} ft-lbf")

   model.plot_hook_load(
       operations=["trip_out", "trip_in", "rotating"],
       title="Deep Well — Hook Load Profile"
   )

Example 5: Unit Conversion and Export
--------------------------------------

.. code-block:: python

   import wellpath_analyst as wpa

   # Load a survey in feet
   survey = wpa.load_survey("data/well_imperial.csv", depth_unit="ft")

   # Convert to metric
   survey_m = survey.convert_depth("m")

   # Calculate trajectory in metric
   traj_m = survey_m.calculate()

   # Export in metric
   traj_m.to_csv("output/well_metric_trajectory.csv")
   traj_m.to_excel("output/well_metric_trajectory.xlsx")
