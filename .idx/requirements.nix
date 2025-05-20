{ pkgs ? import <nixpkgs> {} }:

pkgs.python312.withPackages (ps: [
  ps.flask
  ps.flask-cors
  ps.python-dotenv
  ps.google-generativeai
])
