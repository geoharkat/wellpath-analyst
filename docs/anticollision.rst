.. _anticollision:

Anti-Collision Analysis
=======================

Anti-collision analysis ensures that planned or drilling wells maintain
safe separation from existing (offset) wells. Wellpath Analyst provides
tools for computing separation factors and identifying close approaches.

Separation Factor
-----------------

The **Separation Factor (SF)** is the ratio of the center-to-center
distance between two wells to the sum of their uncertainty ellipsoids
at a given depth. An SF less than 1.0 indicates the uncertainty
ellipsoids overlap — a potential collision risk.

.. math::

   SF = \frac{D_{center}}{r_{ref} + r_{offset}}

where:

-  :math:`D_{center}` = distance between well centerlines
-  :math:`r_{ref}` = uncertainty ellipse semi-axis of the reference well
-  :math:`r_{offset}` = uncertainty ellipse semi-axis of the offset well

Computing Separation Factor
---------------------------

.. code-block:: python

   result = wpa.anticollision.separation_factor(
       reference=traj_alpha,
       offset=traj_beta,
       uncertainty_model="iscwsa",
   )

   # Access results
   print(f"Minimum SF: {result.min_sf:.3f}")
   print(f"Closest approach MD (ref): {result.closest_md_ref:.1f} ft")
   print(f"Closest approach MD (off): {result.closest_md_off:.1f} ft")
   print(f"Center-to-center distance: {result.min_distance:.1f} ft")

   # Full results as DataFrame
   df = result.to_dataframe()
   print(df[["md_ref", "md_offset", "distance", "sf"]].head())

Uncertainty Models
------------------

Wellpath Analyst supports the following uncertainty models:

ISCWSA (Industry Standard)
   The SPE WPTS / ISCWSA collision avoidance rule set. This is the
   industry-standard model and the default.

Constant Ellipse
   A simplified model using a fixed uncertainty radius at all depths.
   Useful for quick screening.

.. code-block:: python

   # ISCWSA model (default)
   result = wpa.anticollision.separation_factor(
       traj_alpha, traj_beta, uncertainty_model="iscwsa"
   )

   # Constant ellipse model
   result = wpa.anticollision.separation_factor(
       traj_alpha, traj_beta,
       uncertainty_model="constant",
       constant_radius=50.0  # ft
   )

ISCWSA Error Model Parameters
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

When using the ISCWSA model, you can specify error model terms:

.. code-block:: python

   from wellpath_analyst.anticollision import ISCWSAErrorModel

   error_model = ISCWSAErrorModel(
       misalignment=0.5,        # degrees
       axial_msa=0.0,           # degrees
       axial_mti=0.0,           # degrees
       axial_ami=0.0,           # degrees
       depth_ref_error=0.5,     # ft per 1000ft
       depth_mti_error=0.0,     # ft
       inc_ref_error=0.2,       # degrees
       inc_mti_error=0.0,       # degrees
       azi_ref_error=0.2,       # degrees
       azi_mti_error=0.0,       # degrees
   )

   result = wpa.anticollision.separation_factor(
       traj_alpha, traj_beta,
       uncertainty_model=error_model,
   )

Traveling Cylinder Plot
-----------------------

The **Traveling Cylinder** plot is a standard visualization for
anti-collision. It shows offset wells projected onto a cylinder centered
on the reference well.

.. code-block:: python

   result.traveling_cylinder_plot(
       title="Traveling Cylinder — Well Alpha",
       sf_cutoff=2.0,              # Only show offsets with SF < 2.0
       backend="plotly"
   )

Close Approach Report
---------------------

Generate a detailed report of all close approaches below a specified
SF threshold::

   report = result.close_approach_report(sf_threshold=2.0)
   print(report.to_string())

   # Export to CSV
   report.to_csv("close_approaches.csv")

Output columns:

=============== ==========================================================
Column          Description
=============== ==========================================================
``md_ref``      Measured depth on the reference well
``md_offset``   Measured depth on the offset well
``distance``    Center-to-center distance (ft or m)
``sf``          Separation factor
``n_offset``    Northing of offset well at closest point
``e_offset``    Easting of offset well at closest point
``tvd_offset``  TVD of offset well at closest point
=============== ==========================================================

Multi-Well Anti-Collision
-------------------------

Check one reference well against multiple offset wells simultaneously::

   results = wpa.anticollision.multi_well_sf(
       reference=traj_alpha,
       offsets=[traj_beta, traj_gamma, traj_delta],
       labels=["Beta", "Gamma", "Delta"],
   )

   # Summary
   for label, result in results.items():
       print(f"{label}: Min SF = {result.min_sf:.3f}")
