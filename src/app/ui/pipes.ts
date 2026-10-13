import { Pipe, PipeTransform } from '@angular/core';
import { fDate, fmt, fTime } from '../core/util';

@Pipe({ name: 'num' }) export class NumPipe implements PipeTransform { transform(v: number) { return fmt(v); } }
@Pipe({ name: 'fd' }) export class FdPipe implements PipeTransform { transform(v: number) { return fDate(v); } }
@Pipe({ name: 'ft' }) export class FtPipe implements PipeTransform { transform(v: number) { return fTime(v); } }
