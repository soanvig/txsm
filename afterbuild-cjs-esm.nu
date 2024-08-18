#!/bin/env nu

ls ./build/cjs/**/* | where type == file | par-each {
  let file = $in.name

  open --raw $file | decode utf-8
    | str replace --all '.mjs' '.cjs'
    | str replace --all '.mts' '.cts'
    | save -f $file

  let fixed_filename = $file
    | str replace --all '.mjs' '.cjs'
    | str replace --all '.mts' '.cts'

  if $file != $fixed_filename {
    mv $file $fixed_filename
  }

  $file
}