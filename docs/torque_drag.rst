.. _torque_drag:

Torque and Drag
===============

Wellpath Analyst includes a simplified torque and drag module for
estimating hook load and surface torque during drilling and tripping
operations.

.. note::
   This module provides first-order estimates suitable for planning
   purposes. It does not replace full finite-element or finite-difference
   torque and drag simulation software.

Soft-String Model
-----------------

The default model is the **soft-string** approach, which assumes the
drillstring conforms to the wellbore trajectory without bending
stiffness.

Computing Hook Load
-------------------

.. code-block:: python

   from wellpath_analyst.torque_drag import TorqueDragModel

   model = TorqueDragModel(
       trajectory=trajectory,
       pipe_od=5.0,            # inches
       pipe_id=4.276,          # inches
       pipe_weight=19.5,       # lb/ft
       mud_weight=10.0,        # ppg
       c_factor=0.25,          # friction coefficient
   )

   # Hook load while tripping out
   hl_out = model.hook_load(operation="trip_out")
   print(f"Hook load (trip out): {hl_out:.0f} lbf")

   # Hook load while tripping in
   hl_in = model.hook_load(operation="trip_in")
   print(f"Hook load (trip in): {hl_in:.0f} lbf")

   # Hook load while rotating (rotating off bottom)
   hl_rot = model.hook_load(operation="rotating")
   print(f"Hook load (rotating): {hl_rot:.0f} lbf")

Computing Surface Torque
------------------------

.. code-block:: python

   torque = model.surface_torque(operation="rotating")
   print(f"Surface torque: {torque:.0f} ft-lbf")

Side Force Profile
------------------

Retrieve the side force at each survey station::

   sf = model.side_force_profile()
   print(sf.to_dataframe().head())

Output columns:

-  ``MD`` — Measured depth
-  ``side_force`` — Normal contact force (lbf/ft or N/m)
-  ``cumulative_drag`` — Cumulative axial drag force (lbf or N)

Plotting
--------

.. code-block:: python

   model.plot_hook_load(
       operations=["trip_out", "trip_in", "rotating"],
       title="Hook Load Profile — Well Alpha"
   )

   model.plot_side_force(title="Side Force Profile — Well Alpha")

Parameter Reference
-------------------

================ =========== ==========================================
Parameter        Default     Description
================ =========== ==========================================
``pipe_od``      required    Outside diameter of drill pipe (inches)
``pipe_id``      required    Inside diameter of drill pipe (inches)
``pipe_weight``  required    Linear weight of pipe (lb/ft)
``mud_weight``   required    Mud weight (ppg)
``c_factor``     0.25        Coulomb friction coefficient (dimensionless)
``bha_weight``   0.0         Bottom hole assembly weight (lbf)
``bha_length``   0.0         BHA length (ft)
``wob``          0.0         Weight on bit (lbf)
================ =========== ==========================================
