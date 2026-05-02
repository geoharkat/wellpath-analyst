.. _visualization:

Visualization
=============

Wellpath Analyst provides both static and interactive 3D visualization
capabilities for well trajectories.

Basic 3D Plot
-------------

Plot a single well trajectory::

   trajectory.plot3d(title="Well Alpha")

The default backend is **matplotlib** with a 3D axes projection.

Multiple Wells
--------------

Plot several trajectories together for comparison::

   wpa.plot_wells(
       [traj_alpha, traj_beta, traj_gamma],
       labels=["Well Alpha", "Well Beta", "Well Gamma"],
       title="Field Development — All Wells"
   )

Each well is rendered in a distinct color with a legend.

Interactive Plotly Backend
--------------------------

For interactive rotation, zoom, and hover information, switch to the
Plotly backend::

   trajectory.plot3d(backend="plotly", title="Well Alpha")

Or for multiple wells::

   wpa.plot_wells(
       [traj_alpha, traj_beta],
       backend="plotly",
       labels=["Alpha", "Beta"]
   )

Interactive features include:

-  Click-and-drag rotation
-  Scroll zoom
-  Hover tooltips showing MD, TVD, Inc, Azi at each station
-  Export to HTML for sharing

.. note::
   The Plotly backend requires the ``viz`` optional dependency group.
   Install it with ``pip install wellpath-analyst[viz]``.

2D Projections
--------------

Generate 2D plan and section views::

   # Plan view (Northing vs. Easting)
   trajectory.plot_plan(title="Plan View — Well Alpha")

   # Vertical section view
   trajectory.plot_section(
       azimuth=90.0,
       title="Vertical Section at 90° Azimuth"
   )

   # TVD vs. MD plot
   trajectory.plot_tvd_vs_md(title="TVD vs. MD")

Customization
-------------

All plotting functions accept keyword arguments for customization:

============= ==========================================================
Parameter     Description
============= ==========================================================
``title``     Plot title string
``color``     Line color (single well) or list of colors (multi-well)
``linewidth`` Line width in points
``fontsize``  Title and axis label font size
``figsize``   Figure size as ``(width, height)`` tuple (matplotlib only)
``save_path`` File path to save the figure (``.png``, ``.pdf``, ``.svg``)
============= ==========================================================

Example with customization::

   trajectory.plot3d(
       title="Well Alpha — Detailed View",
       color="darkred",
       linewidth=2,
       figsize=(12, 9),
       save_path="well_alpha_3d.png"
   )

Target Visualization
--------------------

Plot planned targets alongside the well path::

   from wellpath_analyst import Target

   targets = [
       Target(northing=1000, easting=2000, tvd=8000, radius=100),
       Target(northing=1200, easting=2200, tvd=9000, radius=150),
   ]

   wpa.plot_wells(
       [trajectory],
       targets=targets,
       labels=["Well Alpha"],
       title="Well Alpha with Targets"
   )

Targets are rendered as semi-transparent spheres or circles at the
specified location with the defined radius.
