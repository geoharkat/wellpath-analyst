.. _trajectory_methods:

Trajectory Calculation Methods
==============================

Wellpath Analyst supports four industry-standard methods for computing
well path coordinates from survey data.

Selecting a Method
------------------

Pass the method name to :meth:`Survey.calculate`::

   trajectory = survey.calculate(method="min_curvature")

Available methods:

========================== ======================== ===========
Method                     String Key               Industry Standard
========================== ======================== ===========
Minimum Curvature          ``"min_curvature"``      API / ISCWSA
Radius of Curvature        ``"radius_curvature"``   SPE
Balanced Tangential        ``"balanced_tangential"`` API
Average Angle              ``"average_angle"``      Quick estimates
========================== ======================== ===========

Minimum Curvature (Default)
----------------------------

The Minimum Curvature method is the most widely used in the industry and
is the API-recommended approach. It treats the well path between two
survey stations as a circular arc in 3D space.

**Key equations:**

The ratio factor (beta) is computed from the dogleg angle (DL) between
adjacent stations::

   DL = acos(cos(Inc2 - Inc1) - sin(Inc1) * sin(Inc2) * (1 - cos(Azi2 - Azi1)))

   RF = (2 / DL) * tan(DL / 2)       # when DL > 0
   RF = 1.0                           # when DL == 0

Position increments::

   dTVD  = (MD2 - MD1) / 2 * (cos(Inc1) + cos(Inc2)) * RF
   dN    = (MD2 - MD1) / 2 * (sin(Inc1)*cos(Azi1) + sin(Inc2)*cos(Azi2)) * RF
   dE    = (MD2 - MD1) / 2 * (sin(Inc1)*sin(Azi1) + sin(Inc2)*sin(Azi2)) * RF

.. note::
   The Minimum Curvature method produces the most accurate results for
   typical directional survey data and is the default for all
   calculations in Wellpath Analyst.

Radius of Curvature
-------------------

This method assumes the well path between stations follows arcs with
constant radii in both the vertical and horizontal planes.

**Use when:**

-  Comparing results with legacy systems that use this method.
-  Analyzing well paths with smooth, continuous curvature.

Balanced Tangential
-------------------

Uses the average of the upper and lower survey station angles as the
effective direction for the course length. Less accurate than Minimum
Curvature for larger doglegs but computationally simpler.

**Use when:**

-  Quick estimates where high accuracy is not required.
-  Small angle changes between stations (Inc and Azi delta < 5°).

Average Angle
-------------

The simplest method. Averages the inclination and azimuth of two
consecutive stations and treats the course length as a straight line
at that average angle.

**Use when:**

-  Rough estimates and quality checks.
-  Very close station spacing where differences between methods are
   negligible.

Method Comparison
-----------------

+----------------------+----------------+------------------+------------------+
| Property             | Min Curvature  | Radius of Curv.  | Balanced Tang.   |
+======================+================+==================+==================+
| Accuracy             | Highest        | High             | Moderate         |
+----------------------+----------------+------------------+------------------+
| Dogleg handling      | Exact          | Good             | Approximate      |
+----------------------+----------------+------------------+------------------+
| Computational cost   | Low            | Low              | Lowest           |
+----------------------+----------------+------------------+------------------+
| API recommended      | Yes            | No               | No               |
+----------------------+----------------+------------------+------------------+
| ISCWSA reference     | Yes            | No               | No               |
+----------------------+----------------+------------------+------------------+

Dogleg Severity (DLS)
---------------------

Dogleg Severity is calculated for every station pair as part of the
trajectory output::

   DLS = (DL / ΔMD) * 100    # °/100ft
   DLS = (DL / ΔMD) * 30     # °/30m

The DLS column is always included in the :class:`Trajectory` output
regardless of the calculation method chosen.

The Trajectory Object
---------------------

The :class:`Trajectory` object returned by :meth:`Survey.calculate`
contains the computed positions and metadata.

.. code-block:: python

   trajectory = survey.calculate(method="min_curvature")

Key attributes:

================= =========================================================
Attribute         Description
================= =========================================================
``positions``     ``pandas.DataFrame`` with MD, Inc, Azi, TVD, N, E, DLS
``method``        Calculation method used
``depth_unit``    Depth unit
``ref_point``     Surface reference coordinates
================= =========================================================

Key methods:

========================== ==========================================
Method                     Description
========================== ==========================================
``to_dataframe()``         Return trajectory as a pandas DataFrame
``to_csv(path)``           Export trajectory to CSV
``to_excel(path)``         Export trajectory to Excel
``plot3d(**kwargs)``       3D visualization (see :ref:`visualization`)
``interpolate(md)``        Interpolate position at a given MD
========================== ==========================================
