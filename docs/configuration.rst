.. _configuration:

Configuration
=============

Wellpath Analyst can be configured via a YAML configuration file,
environment variables, or programmatically.

Configuration File
------------------

Create a ``wellpath_config.yaml`` in your project root or home directory::

   # wellpath_config.yaml
   defaults:
     depth_unit: ft
     angle_unit: deg
     trajectory_method: min_curvature
     magnetic_declination: 0.0

   anticollision:
     uncertainty_model: iscwsa
     sf_threshold: 2.0
     scan_step: 50.0        # MD increment for scan (ft or m)

   visualization:
     default_backend: matplotlib
     figsize: [10, 8]
     dpi: 150
     colors:
       - "#1f77b4"
       - "#ff7f0e"
       - "#2ca02c"
       - "#d62728"
       - "#9467bd"

   torque_drag:
     c_factor: 0.25

Loading Configuration
---------------------

.. code-block:: python

   import wellpath_analyst as wpa

   # Load from default search paths
   wpa.load_config()

   # Load from a specific file
   wpa.load_config("my_project_config.yaml")

   # Set config programmatically
   wpa.set_config("defaults.depth_unit", "m")
   wpa.set_config("anticollision.sf_threshold", 1.5)

Environment Variables
---------------------

Override settings with environment variables prefixed with ``WPA_``::

   export WPA_DEPTH_UNIT=m
   export WPA_ANGLE_UNIT=deg
   export WPA_TRAJECTORY_METHOD=min_curvature
   export WPA_SF_THRESHOLD=1.5

Priority Order
~~~~~~~~~~~~~~

Configuration values are resolved in the following priority (highest first):

1.  Programmatic overrides (``wpa.set_config``)
2.  Environment variables (``WPA_*``)
3.  Configuration file (``wellpath_config.yaml``)
4.  Built-in defaults

Viewing Current Configuration
-----------------------------

.. code-block:: python

   config = wpa.get_config()
   print(config.to_yaml())
