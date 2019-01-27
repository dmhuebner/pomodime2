import { Component, Input, OnInit } from '@angular/core';
import { TimerService } from '../../timer.service';
import { CompletedTimer } from '../../interfaces/CompletedTimer.interface';
import { SettingsService } from '../../../shared/services/settings.service';
import { UsbLightService } from '../../../shared/services/usb-light.service';

@Component({
  selector: 'pm-timer',
  templateUrl: './timer.component.html',
  styleUrls: ['./timer.component.scss']
})
export class TimerComponent implements OnInit {

  @Input()
  timerLength: number;

  @Input()
  breakLength: number;

  @Input()
  timerBumperLength: number;

  timeLeft: number = this.timerLength;
  timerInterval;
  onBreak = false;
  timerOn = false;
  currentTimer: CompletedTimer = {
    completed: false,
    completedWithBreak: false
  };
  showTimerBumpers = false;

  constructor(private timerService: TimerService,
              private settingsService: SettingsService,
              private usbLightService: UsbLightService) { }

  ngOnInit() {
    // Subscribe to onBreak$ subject observable and set value to this.onBreak
    this.timerService.onBreak$.subscribe(val => this.onBreak = val);
    this.timerService.timerOn$.subscribe(val => this.timerOn = val);
    this.showTimerBumpers = this.settingsService.getUseTimerBumpers();
    this.onResetTimer();
  }

  onStartTime() {
    this.handleStartTimerUSBLight();

    this.timerService.setTimerOn(true);
    this.timeLeft--;
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      // If the time is up
      if (this.timeLeft < 0) {
        this.handleTimerIsUp();
      }
    }, 1000);
  }

  onResetTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.endTimer();
  }

  onEndBreak() {
    if (this.onBreak) {
      this.timerService.addCompletedTimer(this.currentTimer);
    }

    this.timerService.setOnBreak(false);
    this.onResetTimer();
  }

  bumpTimerBack() {
    this.timeLeft -= (this.timerBumperLength * 60);
  }

  bumpTimerForward() {
    this.timeLeft += (this.timerBumperLength * 60);
  }

  private endTimer() {
    this.timerService.setTimerOn(false);
    this.timeLeft = this.onBreak ? this.breakLength : this.timerLength;
    // Turn off USB light
    this.usbLightService.setLight('ff9900').subscribe();
  }

  private setTimeLeft() {
    this.timeLeft = this.onBreak ? this.breakLength : this.timerLength;
  }

  private handleStartTimerUSBLight() {
    // Determine what color the USB light should be
    const usbLightColor = this.onBreak ? '00ff00' : 'ff0000';

    // Turn on USB light if it is connected
    this.usbLightService.setLight(usbLightColor).subscribe();
  }

  private handleTimerIsUp() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.endTimer();
    this.currentTimer.completed = true;
    if (this.onBreak) {
      this.currentTimer.completedWithBreak = true;
      this.timerService.addCompletedTimer(this.currentTimer);
      this.currentTimer = {
        completed: false,
        completedWithBreak: false
      };
    }
    this.timerService.setOnBreak(!this.onBreak);
    this.setTimeLeft();
  }

}
